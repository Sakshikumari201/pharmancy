# 💊 PharmaPulse | Enterprise Pharmacy Management System
### Advanced Individual Project Assessment — Full-Stack Web Development
**Client / Assessment Body:** ALGIONS AI LABS PRIVATE LIMITED  
**Assigned Domain:** Pharmacy Management System  
**Tech Stack:** Node.js · Express · TypeScript · Prisma ORM · SQLite · React 18 · Vite · Tailwind CSS · Jest · Swagger/OpenAPI

---

## 🌟 Executive Summary

**PharmaPulse** is a production-grade, database-backed web application architected to solve the complex regulatory, operational, and inventory safety demands of a modern pharmaceutical dispensing business.

The system enforces **First-Expiry-First-Out (FEFO)** auto-allocation, strictly blocks expired batches from sale, guarantees atomic transactions with zero-negative-stock invariant guards, requires mandatory reasons for adjustments, and reconciles stock mathematically with opening/closing proof.

---

## 🏗️ Architecture Overview

```
pharmacymanagement/
├── backend/                   ← Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma      ← Full 11-table relational schema
│   │   ├── seed.ts            ← Deterministic demo data seeder
│   │   └── dev.db             ← SQLite database (auto-created)
│   ├── src/
│   │   ├── controllers/       ← HTTP request handlers (8 controllers)
│   │   ├── services/          ← Business logic layer (8 services)
│   │   ├── routes/            ← Express routers with RBAC middleware
│   │   ├── middleware/        ← JWT auth, role guard, error handler, validator
│   │   ├── validators/        ← Zod schema validators
│   │   ├── docs/swagger.json  ← OpenAPI 3.0 specification
│   │   ├── lib/prisma.ts      ← Singleton Prisma client
│   │   └── config/            ← Environment config
│   └── tests/
│       └── acceptance.test.ts ← 7-test Supertest integration suite (all passing)
└── frontend/                  ← React 18 + Vite SPA
    └── src/
        ├── pages/             ← 10 feature pages
        ├── components/        ← Layout, POS, Invoice, Common UI
        ├── services/          ← Axios API client services (7 modules)
        ├── context/           ← AuthContext (JWT + Role state)
        └── types/             ← Full TypeScript type definitions
```

---

## 🗄️ Database Schema (ER Diagram)

```
User ──────────────────────────────────────────┐
 │ (cashierId)  (receivedById)  (performedById) │
 ↓              ↓               ↓               │
Sale          Purchase       StockMovement    AuditLog
 │              │               │
 ↓              ↓               └── StockAdjustment
SaleItem     PurchaseItem
 │              │
 ↓              ↓
Medicine ←─── Batch ←─── Supplier
 │
 └── Category
```

**Key Relationships & Constraints:**
- `Batch.quantity ≥ 0` — enforced by service-layer transaction
- `Batch.batchNumber` unique per medicine
- `Sale.invoiceNumber` globally unique (auto-generated `INV-YYYY-NNNN`)
- `StockMovement.balanceAfter` — snapshot at time of movement
- `StockAdjustment.reason` — mandatory, min 3 chars (Zod + DB)

---

## 🔐 Server-Side Role-Based Access Control (RBAC)

| Feature | Admin | Pharmacist | Cashier |
| :--- | :---: | :---: | :---: |
| POS Sales & Invoicing | ✅ | ✅ | ✅ |
| View Medicines & Batches | ✅ | ✅ | ✅ |
| Receive Stock (Purchases) | ✅ | ✅ | ❌ 403 |
| Stock Adjustments & Returns | ✅ | ✅ | ❌ 403 |
| Quarantine / Block Batches | ✅ | ✅ | ❌ 403 |
| Manage Medicine Catalogue | ✅ | ✅ | ❌ 403 |
| Financial & Expiry Reports | ✅ | ✅ | ❌ 403 |
| Stock Reconciliation Audit | ✅ | ✅ | ❌ 403 |
| User Administration (RBAC) | ✅ | ❌ 403 | ❌ 403 |
| System Security Audit Trail | ✅ | ✅ | ❌ 403 |

---

## 🎯 All 5 Acceptance Criteria — Verified

| # | Requirement | Evidence |
| :--- | :--- | :--- |
| **1** | Sale deducts from correct batch + records movement | FEFO atomic Prisma transaction; `StockMovement` row created with `balanceAfter` |
| **2** | Expired batch cannot be sold | `HTTP 400` on expired date; POS UI disables expired batch buttons |
| **3** | Low stock & near-expiry alerts | Dashboard warning tables: `totalStock ≤ minStockLevel` and `expiryDate < now+60d` |
| **4** | Adjustments require reason, are auditable | Zod `reason.min(3)` enforced server-side; `AuditLog` + `StockMovement` created |
| **5** | Reconciliation: Opening + Purchases − Sales + Returns ± Adj = Closing | Mathematical per-medicine proof in `/reports?tab=reconciliation` |

---

## 🔑 Demo Credentials

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@pharmacy.com` | `Admin@123` | Full access |
| **Pharmacist** | `pharmacist@pharmacy.com` | `Pharm@123` | Clinical + Inventory |
| **Cashier** | `cashier@pharmacy.com` | `Cashier@123` | POS only |

> 💡 **Tip:** The frontend has a **1-Click Role Switcher** in the navigation bar for rapid evaluator testing.

---

## 🚀 Local Setup & Run Instructions

### Prerequisites
- Node.js ≥ v18  |  npm ≥ v9

### Step 1 — Install All Dependencies
```bash
# From project root
npm run install:all
```

### Step 2 — Seed Demo Data
```bash
npm run seed
```

### Step 3 — Start Both Servers
```bash
npm run dev
```

| Service | URL |
| :--- | :--- |
| **Frontend SPA** | http://localhost:5173 |
| **Backend REST API** | http://localhost:5000/api |
| **Swagger API Docs** | http://localhost:5000/api/docs |
| **Health Check** | http://localhost:5000/api/health |

---

## 🧪 Automated Test Evidence

```bash
cd backend && npm test
```

```text
PASS tests/acceptance.test.ts (5.221 s)
  Pharmacy Management System - Acceptance & Edge Case Tests
    √ 1. A sale deducts quantity from the correct batch and records a stock movement (122 ms)
    √ 2. An expired batch cannot be sold (Rejects with 400 error) (71 ms)
    √ 3. The system warns about low stock and near-expiry batches (117 ms)
    √ 4. Stock adjustment without reason fails; adjustment with reason is audited (177 ms)
    √ Negative Stock Guard: Attempting to deduct more than available fails (49 ms)
    √ 5. Stock reconciliation reconciles opening + purchases - sales + adjustments (43 ms)
    √ Security & RBAC: Cashier is blocked from user admin & stock adjustments (65 ms)

Tests: 7 passed, 7 total
```

---

## ⚙️ Environment Variables

Copy `backend/.env.example` → `backend/.env`:

```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="algions-pharmacy-jwt-secret-super-secure-key"
JWT_EXPIRES_IN="1d"
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

Frontend (`frontend/.env`):
```env
VITE_API_URL="http://localhost:5000/api"
```

---

## 📝 Known Limitations & Assumptions

1. **SQLite** — Used for reproducible local evaluation. Schema is Prisma-compatible with PostgreSQL by changing one line in `schema.prisma`.
2. **Local-only demo** — No paid hosting. Frontend + backend run locally on port 5173/5000.
3. **Fictional products** — All medicine names, SKUs, and dosages are simulated for assessment purposes only. No real medical advice.
4. **Barcode scanner** — Schema stores barcode field; hardware scanner integration would trigger POS search input.
5. **Demo video** — Recorded walkthrough covers all 5 acceptance criteria, RBAC enforcement, and test run.

---

## 🤖 AI & Attribution

- Gemini / Claude AI was used for drafting TypeScript boilerplate and UI component structure
- All business logic, database schema design, FEFO algorithm, reconciliation formula, test cases, and architecture decisions were authored and are fully explainable by the candidate
- No real patient data, credentials, or secrets are stored in the repository
- Dataset: entirely fictional pharmaceutical product names for demonstration
