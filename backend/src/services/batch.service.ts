import prisma from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export class BatchService {
  static async getBatches(params: {
    medicineId?: string;
    status?: 'all' | 'valid' | 'expired' | 'near_expiry';
    search?: string;
  }) {
    const now = new Date();
    const nearExpiryCutoff = new Date(now);
    nearExpiryCutoff.setDate(nearExpiryCutoff.getDate() + 60); // 60 days

    const where: any = {};

    if (params.medicineId) {
      where.medicineId = params.medicineId;
    }

    if (params.search) {
      where.batchNumber = { contains: params.search.trim() };
    }

    if (params.status === 'expired') {
      where.expiryDate = { lte: now };
    } else if (params.status === 'valid') {
      where.expiryDate = { gt: now };
      where.quantity = { gt: 0 };
    } else if (params.status === 'near_expiry') {
      where.expiryDate = { gt: now, lte: nearExpiryCutoff };
      where.quantity = { gt: 0 };
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            genericName: true,
            sku: true,
            unit: true,
            minStockLevel: true,
            category: { select: { name: true } }
          }
        },
        supplier: {
          select: { id: true, name: true, phone: true }
        }
      },
      orderBy: { expiryDate: 'asc' } // FEFO order
    });

    return batches.map((batch) => {
      const isExpired = batch.expiryDate <= now;
      const daysToExpiry = Math.ceil((batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isNearExpiry = !isExpired && daysToExpiry <= 60;

      return {
        ...batch,
        isExpired,
        isNearExpiry,
        daysToExpiry
      };
    });
  }

  static async getAvailableBatchesForMedicine(medicineId: string) {
    const now = new Date();

    const batches = await prisma.batch.findMany({
      where: {
        medicineId,
        quantity: { gt: 0 }
      },
      include: {
        supplier: { select: { id: true, name: true } }
      },
      orderBy: { expiryDate: 'asc' } // FEFO order: earliest expiry first
    });

    return batches.map((batch) => {
      const isExpired = batch.expiryDate <= now;
      const daysToExpiry = Math.ceil((batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isNearExpiry = !isExpired && daysToExpiry <= 60;

      return {
        ...batch,
        isExpired,
        isNearExpiry,
        daysToExpiry,
        canBeSold: !isExpired && !batch.isBlocked && batch.quantity > 0
      };
    });
  }

  static async toggleBatchBlock(id: string, reason?: string, userId?: string) {
    const batch = await prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    const updated = await prisma.batch.update({
      where: { id },
      data: { isBlocked: !batch.isBlocked }
    });

    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: updated.isBlocked ? 'BATCH_BLOCKED_QUARANTINE' : 'BATCH_UNBLOCKED',
          entityType: 'Batch',
          entityId: id,
          details: JSON.stringify({ batchNumber: batch.batchNumber, reason })
        }
      });
    }

    return updated;
  }

  // Acceptance Test #3: System warns about low stock and near-expiry batches
  static async getAlerts() {
    const now = new Date();
    const sixtyDaysFromNow = new Date(now);
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    // 1. Low stock medicines
    const allMedicines = await prisma.medicine.findMany({
      where: { isActive: true },
      include: { category: { select: { name: true } } }
    });

    const lowStockMedicines = allMedicines
      .filter((m) => m.totalStock <= m.minStockLevel)
      .map((m) => ({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        sku: m.sku,
        category: m.category.name,
        currentStock: m.totalStock,
        minStockLevel: m.minStockLevel,
        deficit: m.minStockLevel - m.totalStock,
        unit: m.unit,
        isOutOfStock: m.totalStock === 0
      }))
      .sort((a, b) => a.currentStock - b.currentStock);

    // 2. Near expiry batches (expiring within 60 days, not yet expired, stock > 0)
    const nearExpiryBatches = await prisma.batch.findMany({
      where: {
        expiryDate: { gt: now, lte: sixtyDaysFromNow },
        quantity: { gt: 0 }
      },
      include: {
        medicine: { select: { id: true, name: true, sku: true, unit: true } }
      },
      orderBy: { expiryDate: 'asc' }
    });

    const nearExpiryFormatted = nearExpiryBatches.map((b) => {
      const daysLeft = Math.ceil((b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: b.id,
        batchNumber: b.batchNumber,
        medicineId: b.medicineId,
        medicineName: b.medicine.name,
        sku: b.medicine.sku,
        quantity: b.quantity,
        salePrice: b.salePrice,
        expiryDate: b.expiryDate,
        daysLeft,
        rackLocation: b.rackLocation
      };
    });

    // 3. Expired batches with stock > 0 (Action Required: quarantine/disposal)
    const expiredBatches = await prisma.batch.findMany({
      where: {
        expiryDate: { lte: now },
        quantity: { gt: 0 }
      },
      include: {
        medicine: { select: { id: true, name: true, sku: true, unit: true } }
      },
      orderBy: { expiryDate: 'asc' }
    });

    const expiredFormatted = expiredBatches.map((b) => {
      const daysExpired = Math.ceil((now.getTime() - b.expiryDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: b.id,
        batchNumber: b.batchNumber,
        medicineId: b.medicineId,
        medicineName: b.medicine.name,
        sku: b.medicine.sku,
        quantity: b.quantity,
        purchasePrice: b.purchasePrice,
        lossValue: Number((b.quantity * b.purchasePrice).toFixed(2)),
        expiryDate: b.expiryDate,
        daysExpired,
        rackLocation: b.rackLocation
      };
    });

    return {
      summary: {
        lowStockCount: lowStockMedicines.length,
        outOfStockCount: lowStockMedicines.filter((m) => m.isOutOfStock).length,
        nearExpiryCount: nearExpiryFormatted.length,
        expiredCount: expiredFormatted.length
      },
      lowStockMedicines,
      nearExpiryBatches: nearExpiryFormatted,
      expiredBatches: expiredFormatted
    };
  }
}
