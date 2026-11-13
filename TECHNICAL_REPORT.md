# PharmaPulse — Technical Design Report
**Assignment:** Pharmacy Management System  
**Client:** ALGIONS AI LABS PRIVATE LIMITED  
**Tech Stack:** Node.js · Express · TypeScript · Prisma ORM · SQLite · React 18 · Vite · Tailwind CSS · Jest · Swagger/OpenAPI 3.0  

---

## 1. Architecture Overview

PharmaPulse follows a **modular monolith** pattern — a deliberate choice for a local-first evaluation environment. The system is structured as three distinct layers, each with clearly bounded responsibilities:

```
┌──────────────────────────────────────────────────────────────┐
│  React 18 SPA (Vite + TypeScript + Tailwind CSS)             │
│  Port 5173 — FEFO POS, Dashboard, Reports, Audit Trail       │
└────────────────────────┬─────────────────────────────────────┘
                         │  HTTP + JWT Bearer Token
┌────────────────────────▼─────────────────────────────────────┐
│  Express REST API (TypeScript)                               │
│  Port 5000  — Controllers → Services → Prisma ORM           │
│  /api/docs  — Swagger UI                                     │
└────────────────────────┬─────────────────────────────────────┘
                         │  Prisma Client (type-safe ORM)
┌────────────────────────▼─────────────────────────────────────┐
│  SQLite Database (dev.db)                                    │
│  11 tables · Transactions · Indexes · Foreign key cascades  │
└──────────────────────────────────────────────────────────────┘
```

**Why modular monolith?**  
Microservices add operational overhead (service discovery, distributed transactions, inter-process authentication) that is not justified for an assessment with a single evaluator and no scaling requirements. A modular monolith achieves strong separation of concerns while remaining straightforward to run and explain locally.

---

## 2. Database Design Decisions

### 2.1 Why SQLite?

- **Zero external dependencies** — evaluators run the app with `npm run dev` without installing Postgres or MySQL.
- **Prisma portability** — switching to PostgreSQL requires changing exactly one line in `schema.prisma` (`provider = "sqlite"` → `provider = "postgresql"`). All Prisma schema constructs, relations, and transaction semantics are portable.
- **Full ACID compliance** — SQLite in WAL mode supports serializable transactions, which are used for all stock mutations.

### 2.2 Schema Design

The schema has 11 tables organized around the core business entities:

| Table | Purpose |
|:---|:---|
| `User` | Staff authentication, roles (ADMIN / PHARMACIST / CASHIER) |
| `Category` | Medicine classification hierarchy |
| `Supplier` | Vendor master with GSTIN support |
| `Medicine` | Product catalogue (SKU, dosage form, min stock level) |
| `Batch` | Inventory unit of track: quantity, expiry, price, quarantine flag |
| `Purchase` | Stock receipt header + `PurchaseItem` lines |
| `Sale` | Transaction header + `SaleItem` lines |
| `StockMovement` | Immutable ledger: every quantity change recorded with `balanceAfter` snapshot |
| `StockAdjustment` | Formal adjustment events (damage, count correction, return) with mandatory reason |
| `AuditLog` | Security and compliance log — every material action by every actor |

**Key constraints:**
- `Batch.quantity ≥ 0` — enforced at the service layer inside a Prisma transaction before `update` is issued; the database row is never written with a negative value.
- `Batch.batchNumber` unique per medicine — composite unique index.
- `Sale.invoiceNumber` globally unique — auto-generated as `INV-{YEAR}-{zero-padded-sequence}`.
- `StockAdjustment.reason` minimum length 3 characters — enforced at Zod validator layer (server-side) before hitting the DB.

### 2.3 ER Diagram

```
Category ──< Medicine >──< Batch >── Supplier
                 │             │
                 │             └──< PurchaseItem >── Purchase >── Supplier
                 │             └──< SaleItem >──────── Sale >── User (cashier)
                 │             └──< StockMovement
                 │             └──< StockAdjustment
                 └──────────────────────────────── AuditLog >── User (actor)
```

---

## 3. FEFO (First-Expiry-First-Out) Algorithm

### 3.1 Why FEFO?

Standard FIFO (first-in, first-out) selects the oldest purchased batch. For pharmaceuticals, **FEFO selects the soonest-to-expire batch** — a regulatory and safety requirement. A batch purchased 3 years ago but expiring next month must be dispensed before a batch purchased last month that expires in 2 years.

### 3.2 Implementation

In `SaleService.createSale()`:

```typescript
// Get eligible batches in FEFO order
const batches = await prisma.batch.findMany({
  where: {
    medicineId: item.medicineId,
    isBlocked: false,
    quantity: { gt: 0 },
    expiryDate: { gt: new Date() },   // Reject expired batches
  },
  orderBy: { expiryDate: 'asc' },     // FEFO: earliest expiry first
});

// Fulfill quantity greedily across batches
let remaining = item.quantity;
for (const batch of batches) {
  if (remaining <= 0) break;
  const deduct = Math.min(batch.quantity, remaining);
  // ... deduct and record StockMovement
  remaining -= deduct;
}

if (remaining > 0) {
  throw new AppError('Insufficient stock across all valid batches', 400);
}
```

A `batchId` may also be explicitly specified in the sale request (e.g., from the POS batch selector dropdown), in which case FEFO is bypassed and that specific batch is used — provided it is not expired or blocked.

### 3.3 Expired Batch Guard

Both the automatic FEFO path and the explicit batch path validate `expiryDate > now()` before deduction. Attempting to sell an expired batch returns `HTTP 400 Bad Request` with a structured error message. This is acceptance test criterion **#2**.

---

## 4. Transaction Strategy (Atomic Stock Mutations)

Every stock-modifying operation (sale, purchase receipt, stock adjustment) uses a **Prisma interactive transaction**:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Re-read batch quantity inside the transaction (prevents TOCTOU race)
  const batch = await tx.batch.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.quantity < deductQty) throw new AppError('Insufficient stock', 400);

  // 2. Deduct atomically
  await tx.batch.update({
    where: { id: batchId },
    data: { quantity: { decrement: deductQty } }
  });

  // 3. Record immutable StockMovement ledger entry
  await tx.stockMovement.create({ data: { ...movement } });

  // 4. Create SaleItem
  await tx.saleItem.create({ data: { ...saleItem } });
});
```

This guarantees:
- **No partial state** — all-or-nothing write; if any step fails the entire transaction rolls back.
- **No negative stock** — quantity re-read inside the transaction prevents race conditions (TOCTOU).
- **Complete audit trail** — `StockMovement` is always written in the same transaction as the quantity change.

---

## 5. Security Architecture

### 5.1 Authentication

- Passwords are hashed with **bcrypt** (cost factor 12) — no plaintext passwords anywhere.
- **JWT (HS256)** tokens are issued on login with 1-day expiry.
- The `Authorization: Bearer <token>` header is validated by `auth.middleware.ts` on every protected route.
- The `me` endpoint allows the frontend to restore user session on page reload.

### 5.2 Role-Based Access Control (Server-Side)

RBAC is enforced at the **route layer** using `requireRole(...roles)` middleware — not just hidden in the UI:

```typescript
// routes/adjustment.routes.ts
router.post('/', authenticate, requireRole('ADMIN', 'PHARMACIST'), adjustmentController.create);

// routes/user.routes.ts
router.get('/', authenticate, requireRole('ADMIN'), userController.list);
```

A `CASHIER` token hitting `/api/adjustments` receives `HTTP 403 Forbidden` regardless of what the UI shows. This is verified in acceptance test criterion **#7** (Security & RBAC test).

### 5.3 Input Validation

All request bodies are validated with **Zod schemas** before reaching the controller:

```typescript
export const createSaleSchema = z.object({
  items: z.array(z.object({
    medicineId: z.string().uuid(),
    quantity: z.number().int().positive(),
    discount: z.number().min(0).max(100).optional(),
  })).min(1),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI']),
  taxRate: z.number().min(0).max(100).optional(),
});
```

Validation errors return a structured `HTTP 422` response with field-level error messages.

---

## 6. Stock Reconciliation Report

### 6.1 Formula

For each medicine:

$$\text{Closing Stock} = \text{Opening Stock} + \text{Purchases} - \text{Sales} - \text{Disposal} + \text{Returns} \pm \text{Adjustments}$$

### 6.2 Implementation

The `ReportService.getReconciliationReport()` aggregates `StockMovement` rows by type (PURCHASE, SALE, ADJUSTMENT, RETURN, EXPIRED_DISPOSAL) and calculates per-medicine balances. The report then computes `closingStock = openingStock + net movements` and compares it to the actual `Batch.quantity` sum. If they match, the formula is proven balanced.

This is exposed on the **Reports → Reconciliation tab** in the UI with a visual mathematical breakdown per medicine and a reconciliation status indicator (✅ Balanced / ⚠️ Discrepancy).

---

## 7. API Documentation

Swagger UI is available at `http://localhost:5000/api/docs` when the backend is running.

The OpenAPI 3.0 specification is defined in `backend/src/docs/swagger.json` and covers:

| Route Group | Endpoints |
|:---|:---|
| Auth | POST /auth/login, GET /auth/me, POST /auth/register |
| Medicines | GET/POST/PUT/DELETE /medicines, GET /medicines/categories |
| Batches | GET/POST /batches, PUT /batches/:id/block |
| Sales | GET/POST /sales, GET /sales/:id |
| Purchases | GET/POST /purchases, GET /purchases/:id |
| Adjustments | POST /adjustments, GET /adjustments, GET /movements |
| Reports | GET /reports/dashboard, /sales, /valuation, /expiry, /reconciliation |
| Suppliers | GET/POST/PUT/DELETE /suppliers |
| Audit | GET /audit |
| Users | GET /users, PUT /users/:id/status |

---

## 8. Frontend Architecture

### 8.1 Stack

| Concern | Technology |
|:---|:---|
| Framework | React 18 with hooks |
| Build tool | Vite 5 (HMR, ESBuild, optimized prod bundle) |
| Styling | Tailwind CSS 3 (utility-first, dark mode via slate/emerald palette) |
| Routing | React Router 6 (nested routes, protected routes) |
| HTTP client | Axios (JWT interceptor, 401 auto-redirect) |
| State | React Context (AuthContext), local useState/useEffect |
| Type safety | TypeScript strict mode |

### 8.2 Key UX Decisions

- **1-Click Role Switcher** — evaluators can switch between Admin/Pharmacist/Cashier roles without logging out, to rapidly verify RBAC enforcement.
- **Interactive Reviewer Rubric Modal** — a floating button opens an in-app guide mapping each acceptance criterion to the exact UI location where it can be verified.
- **FEFO POS Terminal** — batch selector shows expiry dates and auto-selects the earliest valid batch; expired/quarantined batches are visually disabled.
- **Print-ready Invoice** — `InvoiceModal` renders a formatted tax invoice with Tailwind print utilities (`@media print`), suppressing UI chrome.
- **Consistent empty/loading/error states** — every data-fetching page renders a spinner, empty state illustration, or error toast — no blank screens.

### 8.3 Pages

| Page | Route | Min Role |
|:---|:---|:---|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | CASHIER |
| POS Terminal | `/pos` | CASHIER |
| Sales History | `/sales` | CASHIER |
| Medicine Catalogue | `/medicines` | CASHIER |
| Batch Inspector | `/batches` | CASHIER |
| Supplier Directory | `/suppliers` | CASHIER |
| Stock Purchases | `/purchases` | PHARMACIST |
| Stock Adjustments | `/adjustments` | PHARMACIST |
| Reports | `/reports` | PHARMACIST |
| Audit Trail | `/audit` | PHARMACIST |
| User Management | `/users` | ADMIN |

---

## 9. Test Strategy

**Framework:** Jest + Supertest (HTTP integration tests)

**Approach:** Tests operate against the real SQLite database (reset before each suite) and hit the actual Express app — no mocking of business logic or database layer.

| Test | Criterion | Type |
|:---|:---|:---|
| Sale deducts batch quantity + creates StockMovement | #1 | Integration + DB assertion |
| Expired batch returns HTTP 400 | #2 | Negative case |
| Dashboard returns low-stock and near-expiry warnings | #3 | Integration |
| Adjustment without reason returns 422; with reason creates AuditLog | #4 | Positive + negative |
| Oversell attempt returns 400; stock unchanged | Negative guard | Conflict case |
| Reconciliation formula balances after seed transactions | #5 | Mathematical assertion |
| Cashier token blocked on /users and /adjustments (HTTP 403) | RBAC | Security test |

**Running tests:**
```bash
cd backend
npm test
```

All 7 tests pass in under 6 seconds.

---

## 10. Known Limitations

| Limitation | Detail |
|:---|:---|
| **SQLite concurrency** | SQLite uses file-level locking; a production deployment would use PostgreSQL for multi-process write concurrency. |
| **Local-only demo** | No live deployment URL — evaluator runs locally. Steps are in README. |
| **No WebSocket/real-time** | Dashboard metrics require manual refresh; no push notifications for low-stock events. |
| **No barcode scanner hardware** | The `barcode` field is stored and searchable; physical USB/Bluetooth scanner integration would trigger the POS search input automatically. |
| **No email notifications** | No SMTP integration; expiry alerts are shown in the dashboard only. |
| **Demo video** | A 3–5 minute walkthrough is recorded covering all acceptance criteria, RBAC enforcement, and test run evidence. |
| **No paid hosting** | Local-only as declared. |

---

## 11. AI Tool Usage Disclosure

As required by the submission form, the following AI tools were used:

- **Google Gemini / Antigravity** — Used for drafting TypeScript boilerplate (service layer patterns, Zod schema scaffolding, React component structure), and iterating on UI layout.
- All **business logic** (FEFO algorithm, reconciliation formula, negative stock guard, RBAC middleware design, transaction strategy), **database schema design**, **test case design**, and **architecture decisions** were authored and are fully explainable by the candidate.
- No real patient data, PII, or secrets are present anywhere in the repository.
- All medicine names, supplier names, and dosages are fictional for assessment purposes only.

---

*Report generated: November 2026 | PharmaPulse v1.0.0*
