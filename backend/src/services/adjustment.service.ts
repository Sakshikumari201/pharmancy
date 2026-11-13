import { AdjustmentType, MovementType } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface CreateAdjustmentInput {
  batchId: string;
  type: AdjustmentType;
  quantityChange: number; // Positive (return / found stock) or Negative (damage / discard)
  reason: string; // MANDATORY
  notes?: string;
}

export class AdjustmentService {
  // Acceptance Test #4: Returns/adjustments require a reason and are auditable
  static async adjustStock(input: CreateAdjustmentInput, userId: string) {
    if (!input.reason || input.reason.trim().length < 3) {
      throw new AppError('A valid adjustment reason is mandatory (minimum 3 characters required)', 400);
    }

    if (input.quantityChange === 0) {
      throw new AppError('Quantity change must not be zero', 400);
    }

    return prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: input.batchId },
        include: { medicine: true }
      });

      if (!batch) {
        throw new AppError('Batch not found', 404);
      }

      const newBatchQty = batch.quantity + input.quantityChange;

      // Stock must NEVER silently become negative!
      if (newBatchQty < 0) {
        throw new AppError(
          `Invalid stock adjustment: Resulting batch stock cannot be negative. Current stock is ${batch.quantity}, attempted adjustment is ${input.quantityChange}.`,
          400
        );
      }

      const newMedicineTotal = batch.medicine.totalStock + input.quantityChange;
      if (newMedicineTotal < 0) {
        throw new AppError(
          `Invalid stock adjustment: Resulting medicine stock cannot be negative. Current stock is ${batch.medicine.totalStock}.`,
          400
        );
      }

      // Update Batch quantity
      const updatedBatch = await tx.batch.update({
        where: { id: batch.id },
        data: { quantity: newBatchQty }
      });

      // Update Medicine totalStock
      await tx.medicine.update({
        where: { id: batch.medicineId },
        data: { totalStock: newMedicineTotal }
      });

      // Create StockAdjustment record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          batchId: batch.id,
          medicineId: batch.medicineId,
          type: input.type,
          quantityChange: input.quantityChange,
          reason: input.reason.trim(),
          notes: input.notes?.trim() || null,
          performedById: userId
        },
        include: {
          batch: { select: { batchNumber: true, expiryDate: true } },
          medicine: { select: { name: true, sku: true, unit: true } },
          performedBy: { select: { id: true, name: true, role: true } }
        }
      });

      // Map adjustment type to movement type
      let movType: MovementType = MovementType.ADJUSTMENT;
      if (input.type === AdjustmentType.CUSTOMER_RETURN) {
        movType = MovementType.RETURN;
      } else if (input.type === AdjustmentType.EXPIRY_REMOVAL) {
        movType = MovementType.EXPIRED_DISPOSAL;
      }

      // Record immutable StockMovement ledger entry
      await tx.stockMovement.create({
        data: {
          type: movType,
          medicineId: batch.medicineId,
          batchId: batch.id,
          quantityChange: input.quantityChange,
          balanceAfter: newBatchQty,
          referenceId: adjustment.id,
          reason: `${input.type}: ${input.reason.trim()}`,
          performedById: userId
        }
      });

      // System audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'STOCK_ADJUSTMENT',
          entityType: 'StockAdjustment',
          entityId: adjustment.id,
          details: JSON.stringify({
            medicineName: batch.medicine.name,
            batchNumber: batch.batchNumber,
            quantityChange: input.quantityChange,
            previousStock: batch.quantity,
            newStock: newBatchQty,
            type: input.type,
            reason: input.reason.trim()
          })
        }
      });

      return {
        adjustment,
        newBatchQuantity: updatedBatch.quantity,
        newMedicineTotal
      };
    });
  }

  static async getAdjustments(params: {
    medicineId?: string;
    batchId?: string;
    type?: AdjustmentType;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.medicineId) where.medicineId = params.medicineId;
    if (params.batchId) where.batchId = params.batchId;
    if (params.type) where.type = params.type;

    const [total, adjustments] = await Promise.all([
      prisma.stockAdjustment.count({ where }),
      prisma.stockAdjustment.findMany({
        where,
        include: {
          batch: { select: { batchNumber: true, expiryDate: true } },
          medicine: { select: { name: true, sku: true, unit: true } },
          performedBy: { select: { id: true, name: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      items: adjustments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getStockMovements(params: {
    medicineId?: string;
    batchId?: string;
    type?: MovementType;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 30));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.medicineId) where.medicineId = params.medicineId;
    if (params.batchId) where.batchId = params.batchId;
    if (params.type) where.type = params.type;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        include: {
          medicine: { select: { name: true, sku: true, unit: true } },
          batch: { select: { batchNumber: true, expiryDate: true } },
          performedBy: { select: { id: true, name: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      items: movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
