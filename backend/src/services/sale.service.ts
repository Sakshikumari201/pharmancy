import { MovementType, PaymentMethod, SaleStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface SaleItemInput {
  medicineId: string;
  batchId?: string; // Optional: if omitted, auto-allocates via FEFO
  quantity: number;
  discount?: number;
}

export interface CreateSaleInput {
  customerName?: string;
  customerPhone?: string;
  doctorName?: string;
  items: SaleItemInput[];
  discountPercent?: number;
  taxRate?: number; // Defaults to 12% GST
  paymentMethod: PaymentMethod;
  notes?: string;
}

export class SaleService {
  static async createSale(input: CreateSaleInput, cashierId: string) {
    if (!input.items || input.items.length === 0) {
      throw new AppError('Sale must contain at least one item', 400);
    }

    const now = new Date();

    // Run within a Prisma transaction to guarantee ACID integrity and prevent race conditions
    return prisma.$transaction(async (tx) => {
      // 1. Generate sequential invoice number (e.g. INV-2026-0003)
      const count = await tx.sale.count();
      const currentYear = new Date().getFullYear();
      const invoiceNumber = `INV-${currentYear}-${String(count + 1).padStart(4, '0')}`;

      let calculatedSubtotal = 0;
      let totalCostOfGoods = 0;

      // Resolved line items to create
      const itemsToCreate: Array<{
        medicineId: string;
        batchId: string;
        quantity: number;
        unitPrice: number;
        purchasePriceSnapshot: number;
        discount: number;
        taxAmount: number;
        subtotal: number;
      }> = [];

      for (const itemInput of input.items) {
        if (!itemInput.quantity || itemInput.quantity <= 0) {
          throw new AppError('Item quantity must be greater than zero', 400);
        }

        const medicine = await tx.medicine.findUnique({
          where: { id: itemInput.medicineId }
        });

        if (!medicine || !medicine.isActive) {
          throw new AppError(`Medicine with ID ${itemInput.medicineId} not found or inactive`, 404);
        }

        if (itemInput.batchId) {
          // Explicit batch selected
          const batch = await tx.batch.findUnique({
            where: { id: itemInput.batchId }
          });

          if (!batch || batch.medicineId !== medicine.id) {
            throw new AppError(`Batch not found for medicine ${medicine.name}`, 404);
          }

          // Acceptance Test #2: An expired batch cannot be sold.
          if (batch.expiryDate <= now) {
            const expDateStr = batch.expiryDate.toISOString().split('T')[0];
            throw new AppError(
              `Sale rejected: Batch ${batch.batchNumber} of ${medicine.name} expired on ${expDateStr} and cannot be sold.`,
              400
            );
          }

          if (batch.isBlocked) {
            throw new AppError(
              `Batch ${batch.batchNumber} is blocked/quarantined and cannot be dispensed.`,
              400
            );
          }

          if (batch.quantity < itemInput.quantity) {
            throw new AppError(
              `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${itemInput.quantity}`,
              400
            );
          }

          const lineSubtotal = Number((itemInput.quantity * batch.salePrice).toFixed(2));
          const lineTax = Number((lineSubtotal * ((input.taxRate ?? 12.0) / 100)).toFixed(2));

          itemsToCreate.push({
            medicineId: medicine.id,
            batchId: batch.id,
            quantity: itemInput.quantity,
            unitPrice: batch.salePrice,
            purchasePriceSnapshot: batch.purchasePrice,
            discount: itemInput.discount || 0,
            taxAmount: lineTax,
            subtotal: lineSubtotal
          });

          calculatedSubtotal += lineSubtotal;
          totalCostOfGoods += itemInput.quantity * batch.purchasePrice;

          // Deduct batch quantity
          const newBatchQty = batch.quantity - itemInput.quantity;
          await tx.batch.update({
            where: { id: batch.id },
            data: { quantity: newBatchQty }
          });

          // Deduct medicine totalStock
          await tx.medicine.update({
            where: { id: medicine.id },
            data: { totalStock: { decrement: itemInput.quantity } }
          });

          // Acceptance Test #1: Record StockMovement
          await tx.stockMovement.create({
            data: {
              type: MovementType.SALE,
              medicineId: medicine.id,
              batchId: batch.id,
              quantityChange: -itemInput.quantity,
              balanceAfter: newBatchQty,
              referenceId: invoiceNumber,
              reason: `Dispensed under invoice ${invoiceNumber}`,
              performedById: cashierId
            }
          });
        } else {
          // Auto FEFO Allocation (First-Expiry-First-Out)
          // Find all non-expired, non-blocked batches ordered by expiryDate ASC
          const availableBatches = await tx.batch.findMany({
            where: {
              medicineId: medicine.id,
              quantity: { gt: 0 },
              expiryDate: { gt: now },
              isBlocked: false
            },
            orderBy: { expiryDate: 'asc' } // FEFO
          });

          const totalAvailable = availableBatches.reduce((acc, b) => acc + b.quantity, 0);
          if (totalAvailable < itemInput.quantity) {
            throw new AppError(
              `Insufficient non-expired stock for ${medicine.name}. Available: ${totalAvailable}, Requested: ${itemInput.quantity}`,
              400
            );
          }

          let remainingQtyToAllocate = itemInput.quantity;

          for (const batch of availableBatches) {
            if (remainingQtyToAllocate <= 0) break;

            const qtyFromThisBatch = Math.min(batch.quantity, remainingQtyToAllocate);
            remainingQtyToAllocate -= qtyFromThisBatch;

            const lineSubtotal = Number((qtyFromThisBatch * batch.salePrice).toFixed(2));
            const lineTax = Number((lineSubtotal * ((input.taxRate ?? 12.0) / 100)).toFixed(2));

            itemsToCreate.push({
              medicineId: medicine.id,
              batchId: batch.id,
              quantity: qtyFromThisBatch,
              unitPrice: batch.salePrice,
              purchasePriceSnapshot: batch.purchasePrice,
              discount: 0,
              taxAmount: lineTax,
              subtotal: lineSubtotal
            });

            calculatedSubtotal += lineSubtotal;
            totalCostOfGoods += qtyFromThisBatch * batch.purchasePrice;

            const newBatchQty = batch.quantity - qtyFromThisBatch;
            await tx.batch.update({
              where: { id: batch.id },
              data: { quantity: newBatchQty }
            });

            await tx.medicine.update({
              where: { id: medicine.id },
              data: { totalStock: { decrement: qtyFromThisBatch } }
            });

            await tx.stockMovement.create({
              data: {
                type: MovementType.SALE,
                medicineId: medicine.id,
                batchId: batch.id,
                quantityChange: -qtyFromThisBatch,
                balanceAfter: newBatchQty,
                referenceId: invoiceNumber,
                reason: `Dispensed under invoice ${invoiceNumber} (FEFO allocated)`,
                performedById: cashierId
              }
            });
          }
        }
      }

      // Financial calculations
      const discountPct = input.discountPercent || 0;
      const discountAmount = Number(((calculatedSubtotal * discountPct) / 100).toFixed(2));
      const taxableAmount = calculatedSubtotal - discountAmount;
      const taxRate = input.taxRate !== undefined ? input.taxRate : 12.0;
      const totalTax = Number(((taxableAmount * taxRate) / 100).toFixed(2));
      const grandTotal = Number((taxableAmount + totalTax).toFixed(2));

      // Create Sale Record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerName: input.customerName?.trim() || 'Walk-in Customer',
          customerPhone: input.customerPhone?.trim() || null,
          doctorName: input.doctorName?.trim() || null,
          subtotal: calculatedSubtotal,
          discountPercent: discountPct,
          discountAmount,
          taxRate,
          taxAmount: totalTax,
          grandTotal,
          paymentMethod: input.paymentMethod || PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          cashierId,
          notes: input.notes?.trim() || null,
          items: {
            create: itemsToCreate
          }
        },
        include: {
          items: {
            include: {
              medicine: { select: { id: true, name: true, sku: true, unit: true } },
              batch: { select: { id: true, batchNumber: true, expiryDate: true, mrp: true } }
            }
          },
          cashier: { select: { id: true, name: true, role: true } }
        }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: cashierId,
          action: 'SALE_COMPLETED',
          entityType: 'Sale',
          entityId: sale.id,
          details: JSON.stringify({
            invoiceNumber: sale.invoiceNumber,
            grandTotal: sale.grandTotal,
            itemCount: itemsToCreate.length,
            grossProfit: Number((grandTotal - totalTax - totalCostOfGoods).toFixed(2))
          })
        }
      });

      return sale;
    });
  }

  static async getSales(params: {
    search?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: PaymentMethod;
    cashierId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customerName: { contains: q } },
        { customerPhone: { contains: q } }
      ];
    }

    if (params.paymentMethod) {
      where.paymentMethod = params.paymentMethod;
    }

    if (params.cashierId) {
      where.cashierId = params.cashierId;
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          cashier: { select: { id: true, name: true } },
          items: {
            include: {
              medicine: { select: { name: true, unit: true } },
              batch: { select: { batchNumber: true, expiryDate: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      items: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getSaleById(id: string) {
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }]
      },
      include: {
        cashier: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                name: true,
                genericName: true,
                sku: true,
                unit: true,
                dosageForm: true,
                requiresPrescription: true
              }
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                expiryDate: true,
                mrp: true
              }
            }
          }
        }
      }
    });

    if (!sale) {
      throw new AppError('Sale invoice not found', 404);
    }

    return sale;
  }
}
