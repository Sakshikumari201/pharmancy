import { PrismaClient, Role, MovementType, PaymentMethod, SaleStatus, PurchaseStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Pharmacy Management Database ---');

  // Clean existing tables in order
  await prisma.auditLog.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  // 1. Users
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const pharmPasswordHash = await bcrypt.hash('Pharm@123', 10);
  const cashierPasswordHash = await bcrypt.hash('Cashier@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Sarah Alistair',
      email: 'admin@pharmacy.com',
      passwordHash,
      role: Role.ADMIN,
      phone: '+91-9876543210'
    }
  });

  const pharmacist = await prisma.user.create({
    data: {
      name: 'Marcus Vance, RPh',
      email: 'pharmacist@pharmacy.com',
      passwordHash: pharmPasswordHash,
      role: Role.PHARMACIST,
      phone: '+91-9876543211'
    }
  });

  const cashier = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'cashier@pharmacy.com',
      passwordHash: cashierPasswordHash,
      role: Role.CASHIER,
      phone: '+91-9876543212'
    }
  });

  console.log('Seeded Users: Admin, Pharmacist, Cashier');

  // 2. Categories
  const catAntibiotics = await prisma.category.create({
    data: { name: 'Antibiotics', description: 'Anti-bacterial medications' }
  });
  const catAnalgesics = await prisma.category.create({
    data: { name: 'Analgesics & Antipyretics', description: 'Pain relief and fever reduction' }
  });
  const catCardio = await prisma.category.create({
    data: { name: 'Cardiovascular', description: 'Blood pressure and heart care' }
  });
  const catDiabetes = await prisma.category.create({
    data: { name: 'Antidiabetics', description: 'Blood sugar management' }
  });
  const catRespiratory = await prisma.category.create({
    data: { name: 'Respiratory & Anti-allergic', description: 'Allergy, cough, and asthma management' }
  });
  const catGastro = await prisma.category.create({
    data: { name: 'Gastrointestinal', description: 'Digestive and antacid formulations' }
  });
  const catVitamins = await prisma.category.create({
    data: { name: 'Vitamins & Supplements', description: 'Nutritional and vitamin supplements' }
  });

  console.log('Seeded Categories');

  // 3. Suppliers
  const supApex = await prisma.supplier.create({
    data: {
      name: 'Apex Pharma Distributors',
      contactPerson: 'Robert Hayes',
      email: 'robert@apexpharma.com',
      phone: '+91-9811122233',
      address: 'Plot 45, Industrial Area Phase II, Mumbai',
      gstin: '27AAPCA1234A1Z5'
    }
  });

  const supMedilife = await prisma.supplier.create({
    data: {
      name: 'MediLife Lifesciences',
      contactPerson: 'Anita Sharma',
      email: 'orders@medilife.in',
      phone: '+91-9822233344',
      address: 'Tech Park Zone B, Bengaluru',
      gstin: '27AABCM5678B2Z1'
    }
  });

  const supNova = await prisma.supplier.create({
    data: {
      name: 'NovaCare Healthcare Ltd',
      contactPerson: 'David Kim',
      email: 'support@novacare.com',
      phone: '+91-9833344455',
      address: 'Sector 62, Noida, NCR',
      gstin: '27AACCN9012C3Z8'
    }
  });

  console.log('Seeded Suppliers');

  // Helper date generators
  const now = new Date();
  const daysFromNow = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };
  const monthsFromNow = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  // 4. Medicines & Batches
  // Medicine 1: Amoxicap 500 (Antibiotic)
  const medAmoxicap = await prisma.medicine.create({
    data: {
      name: 'Amoxicap 500',
      genericName: 'Amoxicillin Trihydrate 500mg',
      sku: 'MED-AMX-500',
      barcode: '890123450001',
      categoryId: catAntibiotics.id,
      description: 'Broad-spectrum penicillin antibiotic capsule for bacterial infections.',
      dosageForm: 'Capsule',
      strength: '500mg',
      unit: 'Strip (10 Caps)',
      minStockLevel: 25,
      requiresPrescription: true,
      location: 'Rack A-01',
      totalStock: 170
    }
  });

  const batchAmxNearExpiry = await prisma.batch.create({
    data: {
      batchNumber: 'AMX-2402',
      medicineId: medAmoxicap.id,
      supplierId: supApex.id,
      initialQuantity: 50,
      quantity: 20, // Near expiry in 20 days!
      purchasePrice: 42.0,
      salePrice: 70.0,
      mrp: 85.0,
      expiryDate: daysFromNow(20),
      rackLocation: 'Rack A-01'
    }
  });

  const batchAmxValid = await prisma.batch.create({
    data: {
      batchNumber: 'AMX-2401',
      medicineId: medAmoxicap.id,
      supplierId: supApex.id,
      initialQuantity: 150,
      quantity: 150,
      purchasePrice: 45.0,
      salePrice: 75.0,
      mrp: 85.0,
      expiryDate: monthsFromNow(14),
      rackLocation: 'Rack A-01'
    }
  });

  // Medicine 2: Paracel 650 (Analgesic) - Has Expired batch, Earlier batch, Later batch for FEFO testing!
  const medParacel = await prisma.medicine.create({
    data: {
      name: 'Paracel 650',
      genericName: 'Paracetamol 650mg',
      sku: 'MED-PAR-650',
      barcode: '890123450002',
      categoryId: catAnalgesics.id,
      description: 'Antipyretic and analgesic tablet for fever and mild to moderate pain.',
      dosageForm: 'Tablet',
      strength: '650mg',
      unit: 'Strip (15 Tabs)',
      minStockLevel: 50,
      requiresPrescription: false,
      location: 'Rack B-03',
      totalStock: 330
    }
  });

  // EXPIRED BATCH - acceptance test #2
  const batchParExpired = await prisma.batch.create({
    data: {
      batchNumber: 'PAR-2309-EXP',
      medicineId: medParacel.id,
      supplierId: supMedilife.id,
      initialQuantity: 30,
      quantity: 30,
      purchasePrice: 18.0,
      salePrice: 32.0,
      mrp: 38.0,
      expiryDate: daysFromNow(-15), // Expired 15 days ago!
      rackLocation: 'Quarantine Bin Q-1'
    }
  });

  // FEFO Priority 1: Expiring in 4 months
  const batchParFEFO1 = await prisma.batch.create({
    data: {
      batchNumber: 'PAR-2405-FEFO',
      medicineId: medParacel.id,
      supplierId: supMedilife.id,
      initialQuantity: 100,
      quantity: 100,
      purchasePrice: 19.0,
      salePrice: 35.0,
      mrp: 40.0,
      expiryDate: monthsFromNow(4),
      rackLocation: 'Rack B-03'
    }
  });

  // FEFO Priority 2: Expiring in 18 months
  const batchParFEFO2 = await prisma.batch.create({
    data: {
      batchNumber: 'PAR-2408-LATER',
      medicineId: medParacel.id,
      supplierId: supMedilife.id,
      initialQuantity: 200,
      quantity: 200,
      purchasePrice: 19.5,
      salePrice: 35.0,
      mrp: 40.0,
      expiryDate: monthsFromNow(18),
      rackLocation: 'Rack B-03'
    }
  });

  // Medicine 3: Cardipress 5 (Cardiovascular) - Low stock alert test!
  const medCardipress = await prisma.medicine.create({
    data: {
      name: 'Cardipress 5',
      genericName: 'Amlodipine Besylate 5mg',
      sku: 'MED-CDP-005',
      barcode: '890123450003',
      categoryId: catCardio.id,
      description: 'Calcium channel blocker for management of hypertension and angina.',
      dosageForm: 'Tablet',
      strength: '5mg',
      unit: 'Strip (14 Tabs)',
      minStockLevel: 25, // Current stock is 8 -> Low Stock Alert!
      requiresPrescription: true,
      location: 'Rack C-02',
      totalStock: 8
    }
  });

  const batchCardiLow = await prisma.batch.create({
    data: {
      batchNumber: 'CDP-2403',
      medicineId: medCardipress.id,
      supplierId: supNova.id,
      initialQuantity: 30,
      quantity: 8, // Low Stock!
      purchasePrice: 30.0,
      salePrice: 52.0,
      mrp: 60.0,
      expiryDate: monthsFromNow(10),
      rackLocation: 'Rack C-02'
    }
  });

  // Medicine 4: Glycomet-F (Antidiabetic)
  const medGlycomet = await prisma.medicine.create({
    data: {
      name: 'Glycomet-F 500',
      genericName: 'Metformin HCl 500mg + Glimepiride 2mg',
      sku: 'MED-GLY-500',
      barcode: '890123450004',
      categoryId: catDiabetes.id,
      description: 'Oral hypoglycemic formulation for Type 2 diabetes management.',
      dosageForm: 'Tablet',
      strength: '500mg/2mg',
      unit: 'Strip (10 Tabs)',
      minStockLevel: 20,
      requiresPrescription: true,
      location: 'Rack C-05',
      totalStock: 80
    }
  });

  const batchGlyco = await prisma.batch.create({
    data: {
      batchNumber: 'GLY-2401',
      medicineId: medGlycomet.id,
      supplierId: supApex.id,
      initialQuantity: 100,
      quantity: 80,
      purchasePrice: 55.0,
      salePrice: 95.0,
      mrp: 110.0,
      expiryDate: monthsFromNow(12),
      rackLocation: 'Rack C-05'
    }
  });

  // Medicine 5: Cetriz-L (Allergy)
  const medCetriz = await prisma.medicine.create({
    data: {
      name: 'Cetriz-L',
      genericName: 'Levocetirizine Dihydrochloride 5mg',
      sku: 'MED-CET-005',
      barcode: '890123450005',
      categoryId: catRespiratory.id,
      description: 'Second-generation non-sedating antihistamine for allergic rhinitis and urticaria.',
      dosageForm: 'Tablet',
      strength: '5mg',
      unit: 'Strip (10 Tabs)',
      minStockLevel: 20,
      requiresPrescription: false,
      location: 'Rack D-01',
      totalStock: 120
    }
  });

  const batchCetriz = await prisma.batch.create({
    data: {
      batchNumber: 'CET-2401',
      medicineId: medCetriz.id,
      supplierId: supMedilife.id,
      initialQuantity: 120,
      quantity: 120,
      purchasePrice: 22.0,
      salePrice: 42.0,
      mrp: 50.0,
      expiryDate: monthsFromNow(16),
      rackLocation: 'Rack D-01'
    }
  });

  // Medicine 6: Pantoz-40 (Gastrointestinal) - Near expiry test!
  const medPantoz = await prisma.medicine.create({
    data: {
      name: 'Pantoz-40',
      genericName: 'Pantoprazole Sodium 40mg',
      sku: 'MED-PAN-040',
      barcode: '890123450006',
      categoryId: catGastro.id,
      description: 'Proton pump inhibitor (PPI) for GERD, peptic ulcers and gastric acid reduction.',
      dosageForm: 'Tablet',
      strength: '40mg',
      unit: 'Strip (10 Tabs)',
      minStockLevel: 30,
      requiresPrescription: false,
      location: 'Rack D-04',
      totalStock: 265
    }
  });

  const batchPantozNearExpiry = await prisma.batch.create({
    data: {
      batchNumber: 'PAN-2402-EXP',
      medicineId: medPantoz.id,
      supplierId: supApex.id,
      initialQuantity: 50,
      quantity: 15, // Near expiry in 45 days
      purchasePrice: 40.0,
      salePrice: 72.0,
      mrp: 85.0,
      expiryDate: daysFromNow(45),
      rackLocation: 'Rack D-04'
    }
  });

  const batchPantozValid = await prisma.batch.create({
    data: {
      batchNumber: 'PAN-2406',
      medicineId: medPantoz.id,
      supplierId: supApex.id,
      initialQuantity: 250,
      quantity: 250,
      purchasePrice: 42.0,
      salePrice: 75.0,
      mrp: 90.0,
      expiryDate: monthsFromNow(20),
      rackLocation: 'Rack D-04'
    }
  });

  // Medicine 7: Vitamix-D3 (Nutritional)
  const medVitamix = await prisma.medicine.create({
    data: {
      name: 'Vitamix-D3 60K',
      genericName: 'Cholecalciferol 60,000 IU',
      sku: 'MED-VIT-060',
      barcode: '890123450007',
      categoryId: catVitamins.id,
      description: 'High-potency Vitamin D3 softgel capsule for bone health and immunity.',
      dosageForm: 'Capsule',
      strength: '60,000 IU',
      unit: 'Bottle (4 Caps)',
      minStockLevel: 20,
      requiresPrescription: false,
      location: 'Rack E-01',
      totalStock: 90
    }
  });

  const batchVitamix = await prisma.batch.create({
    data: {
      batchNumber: 'VIT-2404',
      medicineId: medVitamix.id,
      supplierId: supNova.id,
      initialQuantity: 100,
      quantity: 90,
      purchasePrice: 65.0,
      salePrice: 120.0,
      mrp: 140.0,
      expiryDate: monthsFromNow(22),
      rackLocation: 'Rack E-01'
    }
  });

  // Medicine 8: Azithromac 500 (Antibiotic) - Has another expired batch!
  const medAzithromac = await prisma.medicine.create({
    data: {
      name: 'Azithromac 500',
      genericName: 'Azithromycin Dihydrate 500mg',
      sku: 'MED-AZI-500',
      barcode: '890123450008',
      categoryId: catAntibiotics.id,
      description: 'Macrolide antibiotic for upper and lower respiratory tract infections.',
      dosageForm: 'Tablet',
      strength: '500mg',
      unit: 'Strip (3 Tabs)',
      minStockLevel: 15,
      requiresPrescription: true,
      location: 'Rack A-05',
      totalStock: 70
    }
  });

  const batchAziExpired = await prisma.batch.create({
    data: {
      batchNumber: 'AZI-2311-EXP',
      medicineId: medAzithromac.id,
      supplierId: supNova.id,
      initialQuantity: 10,
      quantity: 10,
      purchasePrice: 50.0,
      salePrice: 95.0,
      mrp: 115.0,
      expiryDate: daysFromNow(-40), // Expired 40 days ago!
      rackLocation: 'Quarantine Bin Q-2'
    }
  });

  const batchAziValid = await prisma.batch.create({
    data: {
      batchNumber: 'AZI-2402',
      medicineId: medAzithromac.id,
      supplierId: supNova.id,
      initialQuantity: 60,
      quantity: 60,
      purchasePrice: 52.0,
      salePrice: 100.0,
      mrp: 120.0,
      expiryDate: monthsFromNow(15),
      rackLocation: 'Rack A-05'
    }
  });

  console.log('Seeded Medicines and Batches');

  // 5. Stock Movements for Initial Inventory (Receipts)
  const allBatches = [
    { batch: batchAmxNearExpiry, med: medAmoxicap, qty: 50 },
    { batch: batchAmxValid, med: medAmoxicap, qty: 150 },
    { batch: batchParExpired, med: medParacel, qty: 30 },
    { batch: batchParFEFO1, med: medParacel, qty: 100 },
    { batch: batchParFEFO2, med: medParacel, qty: 200 },
    { batch: batchCardiLow, med: medCardipress, qty: 30 },
    { batch: batchGlyco, med: medGlycomet, qty: 100 },
    { batch: batchCetriz, med: medCetriz, qty: 120 },
    { batch: batchPantozNearExpiry, med: medPantoz, qty: 50 },
    { batch: batchPantozValid, med: medPantoz, qty: 250 },
    { batch: batchVitamix, med: medVitamix, qty: 100 },
    { batch: batchAziExpired, med: medAzithromac, qty: 10 },
    { batch: batchAziValid, med: medAzithromac, qty: 60 }
  ];

  for (const item of allBatches) {
    await prisma.stockMovement.create({
      data: {
        type: MovementType.PURCHASE,
        medicineId: item.med.id,
        batchId: item.batch.id,
        quantityChange: item.qty,
        balanceAfter: item.qty,
        referenceId: `PO-INIT-${item.batch.batchNumber}`,
        reason: 'Initial inventory receipt from authorized distributor',
        performedById: pharmacist.id,
        createdAt: daysFromNow(-30)
      }
    });
  }

  // 6. Record Historical Sales to establish prior movement and realistic figures
  // Sale 1: Dispensed 30 Amoxicap from AMX-2402
  const sale1Subtotal = 30 * 70.0;
  const sale1Tax = Number((sale1Subtotal * 0.12).toFixed(2));
  const sale1Grand = Number((sale1Subtotal + sale1Tax).toFixed(2));

  const sale1 = await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      customerName: 'John Doe',
      customerPhone: '+91-9988776655',
      doctorName: 'Dr. R. K. Gupta',
      subtotal: sale1Subtotal,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 12.0,
      taxAmount: sale1Tax,
      grandTotal: sale1Grand,
      paymentMethod: PaymentMethod.CASH,
      status: SaleStatus.COMPLETED,
      cashierId: cashier.id,
      notes: 'Standard prescription dispense',
      createdAt: daysFromNow(-5)
    }
  });

  await prisma.saleItem.create({
    data: {
      saleId: sale1.id,
      medicineId: medAmoxicap.id,
      batchId: batchAmxNearExpiry.id,
      quantity: 30,
      unitPrice: 70.0,
      purchasePriceSnapshot: 42.0,
      discount: 0,
      taxAmount: sale1Tax,
      subtotal: sale1Subtotal
    }
  });

  await prisma.stockMovement.create({
    data: {
      type: MovementType.SALE,
      medicineId: medAmoxicap.id,
      batchId: batchAmxNearExpiry.id,
      quantityChange: -30,
      balanceAfter: 20,
      referenceId: sale1.invoiceNumber,
      reason: 'Dispensed under prescription INV-2026-0001',
      performedById: cashier.id,
      createdAt: daysFromNow(-5)
    }
  });

  // Sale 2: Dispensed 22 Cardipress from CDP-2403 (bringing it to low stock 8)
  const sale2Subtotal = 22 * 52.0;
  const sale2Tax = Number((sale2Subtotal * 0.12).toFixed(2));
  const sale2Grand = Number((sale2Subtotal + sale2Tax).toFixed(2));

  const sale2 = await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      customerName: 'Mary Jenkins',
      customerPhone: '+91-9877665544',
      doctorName: 'Dr. Anita Mehta',
      subtotal: sale2Subtotal,
      discountPercent: 5.0,
      discountAmount: Number((sale2Subtotal * 0.05).toFixed(2)),
      taxRate: 12.0,
      taxAmount: sale2Tax,
      grandTotal: Number((sale2Subtotal * 0.95 + sale2Tax).toFixed(2)),
      paymentMethod: PaymentMethod.UPI,
      status: SaleStatus.COMPLETED,
      cashierId: cashier.id,
      notes: 'Patient regular monthly refill',
      createdAt: daysFromNow(-2)
    }
  });

  await prisma.saleItem.create({
    data: {
      saleId: sale2.id,
      medicineId: medCardipress.id,
      batchId: batchCardiLow.id,
      quantity: 22,
      unitPrice: 52.0,
      purchasePriceSnapshot: 30.0,
      discount: Number((sale2Subtotal * 0.05).toFixed(2)),
      taxAmount: sale2Tax,
      subtotal: sale2Subtotal
    }
  });

  await prisma.stockMovement.create({
    data: {
      type: MovementType.SALE,
      medicineId: medCardipress.id,
      batchId: batchCardiLow.id,
      quantityChange: -22,
      balanceAfter: 8,
      referenceId: sale2.invoiceNumber,
      reason: 'Dispensed under prescription INV-2026-0002',
      performedById: cashier.id,
      createdAt: daysFromNow(-2)
    }
  });

  // 7. Stock Adjustment (Damage / Breakage demo with mandatory reason)
  await prisma.stockAdjustment.create({
    data: {
      batchId: batchPantozNearExpiry.id,
      medicineId: medPantoz.id,
      type: 'DAMAGE',
      quantityChange: -5,
      reason: 'Accidental packaging breakage during shelf rearrangement',
      performedById: pharmacist.id,
      notes: 'Inspected by Marcus Vance, quarantined and discarded',
      createdAt: daysFromNow(-1)
    }
  });

  await prisma.stockMovement.create({
    data: {
      type: MovementType.ADJUSTMENT,
      medicineId: medPantoz.id,
      batchId: batchPantozNearExpiry.id,
      quantityChange: -5,
      balanceAfter: 15,
      referenceId: 'ADJ-BREAKAGE-01',
      reason: 'Accidental packaging breakage during shelf rearrangement',
      performedById: pharmacist.id,
      createdAt: daysFromNow(-1)
    }
  });

  console.log('Seeded Sales, Movements, and Audit records');
  console.log('--- Database Seeding Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
