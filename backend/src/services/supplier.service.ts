import prisma from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export class SupplierService {
  static async getSuppliers(search?: string) {
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search.trim() } },
        { contactPerson: { contains: search.trim() } },
        { phone: { contains: search.trim() } },
        { gstin: { contains: search.trim() } }
      ];
    }

    return prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { purchases: true, batches: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async getSupplierById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { receivedDate: 'desc' },
          take: 10,
          include: { items: true }
        },
        batches: {
          take: 20,
          include: { medicine: { select: { name: true, sku: true } } }
        }
      }
    });

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    return supplier;
  }

  static async createSupplier(data: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone: string;
    address?: string;
    gstin?: string;
  }) {
    if (!data.name || !data.phone) {
      throw new AppError('Supplier name and phone are required', 400);
    }

    return prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim(),
        email: data.email?.trim().toLowerCase(),
        phone: data.phone.trim(),
        address: data.address?.trim(),
        gstin: data.gstin?.trim().toUpperCase()
      }
    });
  }

  static async updateSupplier(
    id: string,
    data: {
      name?: string;
      contactPerson?: string;
      email?: string;
      phone?: string;
      address?: string;
      gstin?: string;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Supplier not found', 404);
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson?.trim() }),
        ...(data.email !== undefined && { email: data.email?.trim().toLowerCase() }),
        ...(data.phone && { phone: data.phone.trim() }),
        ...(data.address !== undefined && { address: data.address?.trim() }),
        ...(data.gstin !== undefined && { gstin: data.gstin?.trim().toUpperCase() }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });
  }
}
