import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export class MedicineService {
  static async getMedicines(params: {
    search?: string;
    categoryId?: string;
    stockFilter?: 'all' | 'low_stock' | 'out_of_stock' | 'in_stock';
    prescription?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineWhereInput = { isActive: true };

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q } },
        { genericName: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } }
      ];
    }

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.prescription !== undefined) {
      where.requiresPrescription = params.prescription;
    }

    if (params.stockFilter === 'out_of_stock') {
      where.totalStock = 0;
    } else if (params.stockFilter === 'in_stock') {
      where.totalStock = { gt: 0 };
    }

    const [total, medicines] = await Promise.all([
      prisma.medicine.count({ where }),
      prisma.medicine.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          batches: {
            where: { quantity: { gt: 0 } },
            orderBy: { expiryDate: 'asc' },
            select: {
              id: true,
              batchNumber: true,
              quantity: true,
              purchasePrice: true,
              salePrice: true,
              mrp: true,
              expiryDate: true,
              isBlocked: true,
              rackLocation: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      })
    ]);

    // Enhance with low stock flag
    const items = medicines.map((med) => {
      const isLowStock = med.totalStock <= med.minStockLevel;
      const isOutOfStock = med.totalStock === 0;
      const now = new Date();
      const hasNearExpiry = med.batches.some((b) => {
        const diffDays = (b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > 0 && diffDays <= 60;
      });
      const hasExpired = med.batches.some((b) => b.expiryDate <= now);

      return {
        ...med,
        isLowStock,
        isOutOfStock,
        hasNearExpiry,
        hasExpired
      };
    });

    let filteredItems = items;
    if (params.stockFilter === 'low_stock') {
      filteredItems = items.filter((m) => m.isLowStock && !m.isOutOfStock);
    }

    return {
      items: filteredItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getMedicineById(id: string) {
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        batches: {
          orderBy: { expiryDate: 'asc' },
          include: {
            supplier: { select: { id: true, name: true, phone: true } }
          }
        },
        movements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            performedBy: { select: { id: true, name: true } },
            batch: { select: { batchNumber: true } }
          }
        }
      }
    });

    if (!medicine) {
      throw new AppError('Medicine not found', 404);
    }

    const now = new Date();
    const batchesWithStatus = medicine.batches.map((b) => {
      const isExpired = b.expiryDate <= now;
      const diffDays = Math.ceil((b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isNearExpiry = !isExpired && diffDays <= 60;
      return {
        ...b,
        isExpired,
        isNearExpiry,
        daysToExpiry: diffDays
      };
    });

    return {
      ...medicine,
      batches: batchesWithStatus,
      isLowStock: medicine.totalStock <= medicine.minStockLevel
    };
  }

  static async createMedicine(data: {
    name: string;
    genericName?: string;
    sku: string;
    barcode?: string;
    categoryId: string;
    description?: string;
    dosageForm: string;
    strength?: string;
    unit?: string;
    minStockLevel?: number;
    requiresPrescription?: boolean;
    location?: string;
  }) {
    const existingSku = await prisma.medicine.findUnique({
      where: { sku: data.sku.trim().toUpperCase() }
    });

    if (existingSku) {
      throw new AppError(`A medicine with SKU ${data.sku} already exists`, 400);
    }

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    });

    if (!category) {
      throw new AppError('Specified category does not exist', 400);
    }

    return prisma.medicine.create({
      data: {
        name: data.name.trim(),
        genericName: data.genericName?.trim(),
        sku: data.sku.trim().toUpperCase(),
        barcode: data.barcode?.trim(),
        categoryId: data.categoryId,
        description: data.description?.trim(),
        dosageForm: data.dosageForm.trim(),
        strength: data.strength?.trim(),
        unit: data.unit?.trim() || 'Unit',
        minStockLevel: data.minStockLevel !== undefined ? data.minStockLevel : 20,
        requiresPrescription: Boolean(data.requiresPrescription),
        location: data.location?.trim()
      },
      include: {
        category: true
      }
    });
  }

  static async updateMedicine(
    id: string,
    data: {
      name?: string;
      genericName?: string;
      barcode?: string;
      categoryId?: string;
      description?: string;
      dosageForm?: string;
      strength?: string;
      unit?: string;
      minStockLevel?: number;
      requiresPrescription?: boolean;
      location?: string;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Medicine not found', 404);
    }

    return prisma.medicine.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.genericName !== undefined && { genericName: data.genericName?.trim() }),
        ...(data.barcode !== undefined && { barcode: data.barcode?.trim() }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.dosageForm && { dosageForm: data.dosageForm.trim() }),
        ...(data.strength !== undefined && { strength: data.strength?.trim() }),
        ...(data.unit && { unit: data.unit.trim() }),
        ...(data.minStockLevel !== undefined && { minStockLevel: data.minStockLevel }),
        ...(data.requiresPrescription !== undefined && { requiresPrescription: data.requiresPrescription }),
        ...(data.location !== undefined && { location: data.location?.trim() }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: { category: true }
    });
  }

  static async getCategories() {
    return prisma.category.findMany({
      include: {
        _count: { select: { medicines: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async createCategory(name: string, description?: string) {
    const existing = await prisma.category.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      throw new AppError('Category with this name already exists', 400);
    }

    return prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim()
      }
    });
  }
}
