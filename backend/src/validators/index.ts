import { z } from 'zod';
import { PaymentMethod, AdjustmentType, Role } from '@prisma/client';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(1, 'Password is required')
  })
});

export const registerUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.nativeEnum(Role),
    phone: z.string().optional()
  })
});

export const createMedicineSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Medicine name is required'),
    genericName: z.string().optional(),
    sku: z.string().min(2, 'SKU is required'),
    barcode: z.string().optional(),
    categoryId: z.string().uuid('Valid Category ID is required'),
    description: z.string().optional(),
    dosageForm: z.string().min(1, 'Dosage form is required (e.g. Tablet, Syrup)'),
    strength: z.string().optional(),
    unit: z.string().optional().default('Unit'),
    minStockLevel: z.number().int().nonnegative().optional().default(20),
    requiresPrescription: z.boolean().optional().default(false),
    location: z.string().optional()
  })
});

export const updateMedicineSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid Medicine ID is required')
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    genericName: z.string().optional(),
    barcode: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    description: z.string().optional(),
    dosageForm: z.string().optional(),
    strength: z.string().optional(),
    unit: z.string().optional(),
    minStockLevel: z.number().int().nonnegative().optional(),
    requiresPrescription: z.boolean().optional(),
    location: z.string().optional(),
    isActive: z.boolean().optional()
  })
});

export const createSaleSchema = z.object({
  body: z.object({
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    doctorName: z.string().optional(),
    items: z
      .array(
        z.object({
          medicineId: z.string().uuid('Valid Medicine ID is required'),
          batchId: z.string().uuid().optional(),
          quantity: z.number().int().positive('Quantity must be greater than 0'),
          discount: z.number().min(0).optional().default(0)
        })
      )
      .min(1, 'Sale must include at least one item'),
    discountPercent: z.number().min(0).max(100).optional().default(0),
    taxRate: z.number().min(0).max(100).optional().default(12.0),
    paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
    notes: z.string().optional()
  })
});

export const createPurchaseSchema = z.object({
  body: z.object({
    supplierId: z.string().uuid('Valid Supplier ID is required'),
    invoiceNumber: z.string().min(1, 'Supplier invoice number is required'),
    items: z
      .array(
        z.object({
          medicineId: z.string().uuid('Valid Medicine ID is required'),
          batchNumber: z.string().min(1, 'Batch number is required'),
          quantity: z.number().int().positive('Quantity must be greater than 0'),
          purchasePrice: z.number().positive('Purchase price must be positive'),
          salePrice: z.number().positive('Sale price must be positive'),
          mrp: z.number().positive('MRP must be positive'),
          expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid expiry date required'),
          rackLocation: z.string().optional()
        })
      )
      .min(1, 'Purchase must include at least one item'),
    taxAmount: z.number().min(0).optional().default(0),
    notes: z.string().optional()
  })
});

export const adjustStockSchema = z.object({
  body: z.object({
    batchId: z.string().uuid('Valid Batch ID is required'),
    type: z.nativeEnum(AdjustmentType),
    quantityChange: z.number().int().refine((val) => val !== 0, 'Quantity change cannot be zero'),
    reason: z.string().min(3, 'A valid reason is required (minimum 3 characters)'),
    notes: z.string().optional()
  })
});

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Supplier name is required'),
    contactPerson: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(5, 'Valid phone number is required'),
    address: z.string().optional(),
    gstin: z.string().optional()
  })
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Category name is required'),
    description: z.string().optional()
  })
});
