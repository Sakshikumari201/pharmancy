import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role, AdjustmentType, PaymentMethod } from '@prisma/client';

describe('Pharmacy Management System - Acceptance & Edge Case Tests', () => {
  let adminToken: string;
  let pharmacistToken: string;
  let cashierToken: string;
  let adminUserId: string;
  let testMedicineId: string;
  let validBatchId: string;
  let expiredBatchId: string;
  let lowStockMedicineId: string;

  beforeAll(async () => {
    // 1. Setup Test Users
    const passwordHash = await bcrypt.hash('Test@123', 8);

    // Clean any prior test artifacts
    await prisma.stockMovement.deleteMany();
    await prisma.stockAdjustment.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.medicine.deleteMany();
    await prisma.category.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();

    const admin = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'test_admin@pharmacy.com',
        passwordHash,
        role: Role.ADMIN
      }
    });
    adminUserId = admin.id;

    await prisma.user.create({
      data: {
        name: 'Test Pharmacist',
        email: 'test_pharm@pharmacy.com',
        passwordHash,
        role: Role.PHARMACIST
      }
    });

    await prisma.user.create({
      data: {
        name: 'Test Cashier',
        email: 'test_cashier@pharmacy.com',
        passwordHash,
        role: Role.CASHIER
      }
    });

    // Obtain tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test_admin@pharmacy.com', password: 'Test@123' });
    adminToken = adminLogin.body.data.token;

    const pharmLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test_pharm@pharmacy.com', password: 'Test@123' });
    pharmacistToken = pharmLogin.body.data.token;

    const cashierLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test_cashier@pharmacy.com', password: 'Test@123' });
    cashierToken = cashierLogin.body.data.token;

    // Create Category & Supplier
    const category = await prisma.category.create({
      data: { name: 'Pain Relief', description: 'Analgesics' }
    });

    const supplier = await prisma.supplier.create({
      data: { name: 'Apex Test Pharma', phone: '+91-9999999999' }
    });

    // Create Test Medicine
    const medicine = await prisma.medicine.create({
      data: {
        name: 'Ibuprofen 400mg',
        sku: 'TEST-IBU-400',
        categoryId: category.id,
        dosageForm: 'Tablet',
        unit: 'Strip',
        minStockLevel: 20,
        totalStock: 100
      }
    });
    testMedicineId = medicine.id;

    // Valid Batch (expiring in 1 year)
    const validExpiry = new Date();
    validExpiry.setFullYear(validExpiry.getFullYear() + 1);
    const validBatch = await prisma.batch.create({
      data: {
        batchNumber: 'IBU-VAL-001',
        medicineId: medicine.id,
        supplierId: supplier.id,
        initialQuantity: 100,
        quantity: 100,
        purchasePrice: 20,
        salePrice: 40,
        mrp: 45,
        expiryDate: validExpiry
      }
    });
    validBatchId = validBatch.id;

    // Record initial stock movement for valid batch
    await prisma.stockMovement.create({
      data: {
        type: 'PURCHASE',
        medicineId: medicine.id,
        batchId: validBatch.id,
        quantityChange: 100,
        balanceAfter: 100,
        reason: 'Initial test stock setup',
        performedById: adminUserId
      }
    });

    // Expired Batch (expired 30 days ago)
    const pastExpiry = new Date();
    pastExpiry.setDate(pastExpiry.getDate() - 30);
    const expiredBatch = await prisma.batch.create({
      data: {
        batchNumber: 'IBU-EXP-002',
        medicineId: medicine.id,
        supplierId: supplier.id,
        initialQuantity: 20,
        quantity: 20,
        purchasePrice: 20,
        salePrice: 40,
        mrp: 45,
        expiryDate: pastExpiry
      }
    });
    expiredBatchId = expiredBatch.id;

    // Record stock movement for expired batch inward receipt
    await prisma.stockMovement.create({
      data: {
        type: 'PURCHASE',
        medicineId: medicine.id,
        batchId: expiredBatch.id,
        quantityChange: 20,
        balanceAfter: 20,
        reason: 'Expired batch inward receipt record',
        performedById: adminUserId
      }
    });

    // Low Stock Medicine (minStock: 25, current total: 5)
    const lowMed = await prisma.medicine.create({
      data: {
        name: 'Cough Syrup 100ml',
        sku: 'TEST-CS-100',
        categoryId: category.id,
        dosageForm: 'Syrup',
        unit: 'Bottle',
        minStockLevel: 25,
        totalStock: 5
      }
    });
    lowStockMedicineId = lowMed.id;

    // Near expiry batch (expiring in 15 days)
    const nearExpiry = new Date();
    nearExpiry.setDate(nearExpiry.getDate() + 15);
    await prisma.batch.create({
      data: {
        batchNumber: 'CS-NEAR-001',
        medicineId: lowMed.id,
        supplierId: supplier.id,
        initialQuantity: 5,
        quantity: 5,
        purchasePrice: 50,
        salePrice: 85,
        mrp: 90,
        expiryDate: nearExpiry
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // Acceptance Test #1: A sale deducts quantity from the correct batch and records a stock movement
  // =========================================================================
  test('1. A sale deducts quantity from the correct batch and records a stock movement', async () => {
    const saleQty = 5;

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        customerName: 'Alice Smith',
        items: [
          {
            medicineId: testMedicineId,
            batchId: validBatchId,
            quantity: saleQty
          }
        ],
        taxRate: 12.0,
        paymentMethod: PaymentMethod.CASH
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);

    // Verify Batch quantity was reduced
    const batch = await prisma.batch.findUnique({ where: { id: validBatchId } });
    expect(batch!.quantity).toBe(100 - saleQty);

    // Verify Medicine totalStock was reduced
    const medicine = await prisma.medicine.findUnique({ where: { id: testMedicineId } });
    expect(medicine!.totalStock).toBe(100 - saleQty);

    // Verify StockMovement ledger entry was recorded
    const movements = await prisma.stockMovement.findMany({
      where: {
        batchId: validBatchId,
        type: 'SALE'
      }
    });
    expect(movements.length).toBeGreaterThanOrEqual(1);
    const lastMovement = movements[movements.length - 1];
    expect(lastMovement.quantityChange).toBe(-saleQty);
    expect(lastMovement.balanceAfter).toBe(100 - saleQty);
  });

  // =========================================================================
  // Acceptance Test #2: An expired batch cannot be sold
  // =========================================================================
  test('2. An expired batch cannot be sold (Rejects with 400 error)', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        customerName: 'Bob Jones',
        items: [
          {
            medicineId: testMedicineId,
            batchId: expiredBatchId, // Expired batch!
            quantity: 2
          }
        ],
        paymentMethod: PaymentMethod.CASH
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expired/i);

    // Verify expired batch quantity remained intact
    const batch = await prisma.batch.findUnique({ where: { id: expiredBatchId } });
    expect(batch!.quantity).toBe(20);
  });

  // =========================================================================
  // Acceptance Test #3: The system warns about low stock and near-expiry batches
  // =========================================================================
  test('3. The system warns about low stock and near-expiry batches', async () => {
    // Check Medicine catalogue flag
    const medRes = await request(app)
      .get(`/api/medicines/${lowStockMedicineId}`)
      .set('Authorization', `Bearer ${pharmacistToken}`);

    expect(medRes.status).toBe(200);
    expect(medRes.body.data.isLowStock).toBe(true);

    // Check Batches list for near-expiry and expired alerts
    const batchRes = await request(app)
      .get('/api/batches')
      .set('Authorization', `Bearer ${pharmacistToken}`);

    expect(batchRes.status).toBe(200);
    const nearExpiryBatches = batchRes.body.data.filter((b: any) => b.isNearExpiry);
    const expiredBatches = batchRes.body.data.filter((b: any) => b.isExpired);

    expect(nearExpiryBatches.length).toBeGreaterThanOrEqual(1);
    expect(expiredBatches.length).toBeGreaterThanOrEqual(1);

    // Check Expiry Report endpoint
    const expiryRes = await request(app)
      .get('/api/reports/expiry')
      .set('Authorization', `Bearer ${pharmacistToken}`);

    expect(expiryRes.status).toBe(200);
    expect(expiryRes.body.data.summary.totalExpiredItems).toBeGreaterThanOrEqual(1);
    expect(expiryRes.body.data.within30Days.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // Acceptance Test #4: Returns/adjustments require a reason and are auditable
  // =========================================================================
  test('4. Stock adjustment without reason fails; adjustment with reason is audited', async () => {
    // Negative case: adjustment without reason fails
    const failRes = await request(app)
      .post('/api/stock')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        batchId: validBatchId,
        type: AdjustmentType.DAMAGE,
        quantityChange: -3,
        reason: '' // Empty reason!
      });

    expect(failRes.status).toBe(400);

    // Positive case: valid adjustment with mandatory reason
    const adjustRes = await request(app)
      .post('/api/stock')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        batchId: validBatchId,
        type: AdjustmentType.DAMAGE,
        quantityChange: -3,
        reason: 'Broken blister packs dropped during inventory check'
      });

    expect(adjustRes.status).toBe(201);
    expect(adjustRes.body.success).toBe(true);

    // Verify StockMovement was recorded
    const movements = await prisma.stockMovement.findMany({
      where: {
        batchId: validBatchId,
        type: 'ADJUSTMENT'
      }
    });
    expect(movements.length).toBeGreaterThanOrEqual(1);
    expect(movements[0].reason).toContain('Broken blister packs');

    // Verify AuditLog was recorded
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: 'STOCK_ADJUSTMENT'
      }
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // Edge Case: Stock must never silently become negative
  // =========================================================================
  test('Negative Stock Guard: Attempting to deduct more stock than available fails', async () => {
    const currentBatch = await prisma.batch.findUnique({ where: { id: validBatchId } });
    const excessDeduction = -(currentBatch!.quantity + 50);

    const res = await request(app)
      .post('/api/stock')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        batchId: validBatchId,
        type: AdjustmentType.DAMAGE,
        quantityChange: excessDeduction,
        reason: 'Attempting invalid excess deduction'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/negative/i);
  });

  // =========================================================================
  // Acceptance Test #5: The stock report reconciles with opening stock, purchases, sales and adjustments
  // =========================================================================
  test('5. Stock reconciliation report reconciles opening + purchases - sales + returns ± adjustments = closing stock', async () => {
    const res = await request(app)
      .get(`/api/reports/reconciliation?medicineId=${testMedicineId}`)
      .set('Authorization', `Bearer ${pharmacistToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(1);

    const reportRow = res.body.data.items[0];
    expect(reportRow.medicineId).toBe(testMedicineId);

    // Formula check:
    // calculatedClosingStock = openingStock + purchasesIn - salesOut + returnsIn + adjustmentsDelta - expiredDisposal
    const formulaCalculated =
      reportRow.openingStock +
      reportRow.purchasesIn -
      reportRow.salesOut +
      reportRow.returnsIn +
      reportRow.adjustmentsDelta -
      reportRow.expiredDisposal;

    expect(reportRow.calculatedClosingStock).toBe(formulaCalculated);
    expect(reportRow.variance).toBe(0);
    expect(reportRow.isReconciled).toBe(true);
  });

  // =========================================================================
  // Security & RBAC: Server-side authorization blocks Cashier from admin routes
  // =========================================================================
  test('Security & RBAC: Cashier is blocked from user administration & adjustments', async () => {
    const userAdminRes = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${cashierToken}`);

    expect(userAdminRes.status).toBe(403);
    expect(userAdminRes.body.message).toMatch(/Forbidden/i);

    const adjustRes = await request(app)
      .post('/api/stock')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        batchId: validBatchId,
        type: AdjustmentType.DAMAGE,
        quantityChange: -1,
        reason: 'Cashier trying to adjust'
      });

    expect(adjustRes.status).toBe(403);
  });
});
