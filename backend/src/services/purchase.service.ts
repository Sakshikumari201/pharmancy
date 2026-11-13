import { MovementType, PurchaseStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface PurchaseItemInput {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  expiryDate: string; // ISO date string
  rackLocation?: string;
}

export interface CreatePurchaseInput {
  supplierId: string;
  invoiceNumber: string; // Supplier bill number
  items: PurchaseItemInput[];
  taxAmount?: number;
  notes?: string;
}

export class PurchaseService {
  static async createPurchase(input: CreatePurchaseInput, receivedById: string) {
    if (!input.items || input.items.length === 0) {
      throw new AppError('Purchase must contain at least one item', 400);
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: input.supplierId }
    });

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    const existingPurchase = await prisma.purchase.findUnique({
      where: { invoiceNumber: input.invoiceNumber.trim() }
    });

    if (existingPurchase) {
      throw new AppError(`A purchase with invoice number ${input.invoiceNumber} already exists`, 400);
    }

    return prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const itemsToCreate = [];

      for (const item of input.items) {
        if (item.quantity <= 0) {
          throw new AppError('Quantity must be greater than zero', 400);
        }
        if (item.purchasePrice <= 0 || item.salePrice <= 0 || item.mrp <= 0) {
          throw new AppError('Pricing fields must be greater than zero', 400);
        }
        if (item.salePrice > item.mrp) {
          throw new AppError('Sale price cannot exceed Maximum Retail Price (MRP)', 400);
        }

        const expDate = new Date(item.expiryDate);
        if (expDate <= new Date()) {
          throw new AppError(`Cannot receive stock with already expired batch: ${item.batchNumber}`, 400);
        }

        const medicine = await tx.medicine.findUnique({
          where: { id: item.medicineId }
        });

        if (!medicine) {
          throw new AppError(`Medicine with ID ${item.medicineId} not found`, 404);
        }

        const subtotal = Number((item.quantity * item.purchasePrice).toFixed(2));
        totalAmount += subtotal;

        itemsToCreate.push({
          medicineId: medicine.id,
          batchNumber: item.batchNumber.trim().toUpperCase(),
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          salePrice: item.salePrice,
          mrp: item.mrp,
          expiryDate: expDate,
          subtotal
        });

        // Check if batch already exists for this medicine
        const existingBatch = await tx.batch.findUnique({
          where: {
            medicineId_batchNumber: {
              medicineId: medicine.id,
              batchNumber: item.batchNumber.trim().toUpperCase()
            }
          }
        });

        let targetBatchId: string;
        let newBatchQuantity: number;

        if (existingBatch) {
          newBatchQuantity = existingBatch.quantity + item.quantity;
          targetBatchId = existingBatch.id;

          await tx.batch.update({
            where: { id: existingBatch.id },
            data: {
              quantity: newBatchQuantity,
              purchasePrice: item.purchasePrice, // Update to latest cost
              salePrice: item.salePrice,
              mrp: item.mrp,
              expiryDate: expDate,
              supplierId: supplier.id,
              rackLocation: item.rackLocation?.trim() || existingBatch.rackLocation
            }
          });
        } else {
          newBatchQuantity = item.quantity;
          const newBatch = await tx.batch.create({
            data: {
              batchNumber: item.batchNumber.trim().toUpperCase(),
              medicineId: medicine.id,
              supplierId: supplier.id,
              initialQuantity: item.quantity,
              quantity: item.quantity,
              purchasePrice: item.purchasePrice,
              salePrice: item.salePrice,
              mrp: item.mrp,
              expiryDate: expDate,
              rackLocation: item.rackLocation?.trim() || medicine.location
            }
          });
          targetBatchId = newBatch.id;
        }

        // Increment totalStock on medicine
        await tx.medicine.update({
          where: { id: medicine.id },
          data: { totalStock: { increment: item.quantity } }
        });

        // Record StockMovement
        await tx.stockMovement.create({
          data: {
            type: MovementType.PURCHASE,
            medicineId: medicine.id,
            batchId: targetBatchId,
            quantityChange: item.quantity,
            balanceAfter: newBatchQuantity,
            referenceId: input.invoiceNumber.trim(),
            reason: `Goods receipt from supplier ${supplier.name} (Invoice: ${input.invoiceNumber.trim()})`,
            performedById: receivedById
          }
        });
      }

      const totalTax = input.taxAmount || 0;
      const grandTotal = Number((totalAmount + totalTax).toFixed(2));

      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber: input.invoiceNumber.trim(),
          supplierId: supplier.id,
          totalAmount: grandTotal,
          taxAmount: totalTax,
          status: PurchaseStatus.RECEIVED,
          notes: input.notes?.trim() || null,
          receivedById,
          items: {
            create: itemsToCreate
          }
        },
        include: {
          supplier: true,
          items: {
            include: {
              medicine: { select: { id: true, name: true, sku: true, unit: true } }
            }
          },
          receivedBy: { select: { id: true, name: true, role: true } }
        }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: receivedById,
          action: 'PURCHASE_RECEIVED',
          entityType: 'Purchase',
          entityId: purchase.id,
          details: JSON.stringify({
            invoiceNumber: purchase.invoiceNumber,
            supplier: supplier.name,
            totalAmount: purchase.totalAmount,
            itemCount: input.items.length
          })
        }
      });

      return purchase;
    });
  }

  static async getPurchases(params: {
    supplierId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.search) {
      where.OR = [
        { invoiceNumber: { contains: params.search.trim() } },
        { supplier: { name: { contains: params.search.trim() } } }
      ];
    }

    const [total, purchases] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          receivedBy: { select: { id: true, name: true } },
          items: {
            include: {
              medicine: { select: { name: true, sku: true, unit: true } }
            }
          }
        },
        orderBy: { receivedDate: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      items: purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getPurchaseById(id: string) {
    const purchase = await prisma.purchase.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }]
      },
      include: {
        supplier: true,
        receivedBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, sku: true, unit: true } }
          }
        }
      }
    });

    if (!purchase) {
      throw new AppError('Purchase invoice not found', 404);
    }

    return purchase;
  }
}
