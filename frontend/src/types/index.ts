export type Role = 'ADMIN' | 'PHARMACIST' | 'CASHIER';

export type MovementType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'EXPIRED_DISPOSAL';

export type AdjustmentType = 'DAMAGE' | 'EXPIRY_REMOVAL' | 'COUNT_CORRECTION' | 'CUSTOMER_RETURN';

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI';

export type SaleStatus = 'COMPLETED' | 'REFUNDED' | 'CANCELLED';

export type PurchaseStatus = 'RECEIVED' | 'PENDING' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  medicinesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone: string;
  address?: string | null;
  gstin?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  medicineId: string;
  medicine?: Medicine;
  supplierId?: string | null;
  supplier?: Supplier | null;
  initialQuantity: number;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  expiryDate: string;
  manufacturingDate?: string | null;
  rackLocation?: string | null;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName?: string | null;
  sku: string;
  barcode?: string | null;
  categoryId: string;
  category?: Category;
  description?: string | null;
  dosageForm: string;
  strength?: string | null;
  unit: string;
  minStockLevel: number;
  requiresPrescription: boolean;
  location?: string | null;
  totalStock: number;
  isActive: boolean;
  batches?: Batch[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  medicineId: string;
  medicine?: Medicine;
  batchId: string;
  batch?: Batch;
  quantity: number;
  unitPrice: number;
  purchasePriceSnapshot: number;
  discount: number;
  taxAmount: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  doctorName?: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  cashierId: string;
  cashier?: User;
  notes?: string | null;
  items: SaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  medicineId: string;
  medicine?: Medicine;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  expiryDate: string;
  subtotal: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplier?: Supplier;
  totalAmount: number;
  taxAmount: number;
  status: PurchaseStatus;
  notes?: string | null;
  receivedDate: string;
  receivedById: string;
  receivedBy?: User;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  type: MovementType;
  medicineId: string;
  medicine?: Medicine;
  batchId: string;
  batch?: Batch;
  quantityChange: number;
  balanceAfter: number;
  referenceId?: string | null;
  reason?: string | null;
  performedById: string;
  performedBy?: User;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  batchId: string;
  batch?: Batch;
  medicineId: string;
  medicine?: Medicine;
  type: AdjustmentType;
  quantityChange: number;
  reason: string;
  performedById: string;
  performedBy?: User;
  notes?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  user?: User | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface DashboardMetrics {
  totalMedicines: number;
  totalBatches: number;
  lowStockCount: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiredBatchesCount: number;
  todaySalesCount: number;
  todayRevenue: number;
  totalInventoryCost: number;
  totalInventoryRetail: number;
  lowStockMedicines: Array<{
    id: string;
    name: string;
    sku: string;
    dosageForm: string;
    unit: string;
    minStockLevel: number;
    totalStock: number;
  }>;
  nearExpiryBatches: Array<{
    id: string;
    batchNumber: string;
    medicineName: string;
    quantity: number;
    salePrice: number;
    expiryDate: string;
    daysUntilExpiry: number;
    isBlocked: boolean;
  }>;
  recentMovements: Array<{
    id: string;
    type: MovementType;
    medicineName: string;
    batchNumber: string;
    quantityChange: number;
    balanceAfter: number;
    reason?: string | null;
    performedByName: string;
    createdAt: string;
  }>;
}

export interface SalesReportData {
  summary: {
    totalSales: number;
    grossRevenue: number;
    totalDiscounts: number;
    totalTaxes: number;
    netRevenue: number;
    totalCostOfGoodsSold: number;
    estimatedProfit: number;
    profitMarginPercent: number;
  };
  byPaymentMethod: {
    CASH: { count: number; total: number };
    CARD: { count: number; total: number };
    UPI: { count: number; total: number };
  };
  topSellingMedicines: Array<{
    medicineId: string;
    medicineName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
  }>;
  salesList: Sale[];
}

export interface StockValuationData {
  summary: {
    totalActiveMedicines: number;
    totalBatches: number;
    totalUnitsInStock: number;
    totalCostValue: number;
    totalRetailValue: number;
    potentialProfit: number;
    averageMarginPercent: number;
  };
  byCategory: Array<{
    categoryName: string;
    medicineCount: number;
    totalUnits: number;
    costValue: number;
    retailValue: number;
    potentialProfit: number;
  }>;
  items: Array<{
    medicineId: string;
    medicineName: string;
    sku: string;
    category: string;
    totalStock: number;
    costValue: number;
    retailValue: number;
    marginPercent: number;
  }>;
}

export interface ExpiryReportData {
  summary: {
    expiredCount: number;
    expiredUnits: number;
    expiredLossValue: number;
    criticalCount: number;
    criticalUnits: number;
    warningCount: number;
    warningUnits: number;
    totalRiskValue: number;
  };
  expiredBatches: Array<{
    id: string;
    batchNumber: string;
    medicineName: string;
    sku: string;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    expiryDate: string;
    lossValue: number;
    isBlocked: boolean;
  }>;
  criticalBatches: Array<{
    id: string;
    batchNumber: string;
    medicineName: string;
    sku: string;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    expiryDate: string;
    daysRemaining: number;
    isBlocked: boolean;
  }>;
  warningBatches: Array<{
    id: string;
    batchNumber: string;
    medicineName: string;
    sku: string;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    expiryDate: string;
    daysRemaining: number;
    isBlocked: boolean;
  }>;
}

export interface ReconciliationData {
  summary: {
    reconciliationPeriod: {
      startDate: string;
      endDate: string;
    };
    totalCalculatedOpeningStock: number;
    totalPurchases: number;
    totalSales: number;
    totalReturns: number;
    totalAdjustmentsPositive: number;
    totalAdjustmentsNegative: number;
    totalClosingStock: number;
    isBalanced: boolean;
  };
  reconciledItems: Array<{
    medicineId: string;
    medicineName: string;
    sku: string;
    openingStock: number;
    purchases: number;
    sales: number;
    returns: number;
    adjustments: number;
    calculatedClosing: number;
    actualClosing: number;
    discrepancy: number;
    status: 'BALANCED' | 'DISCREPANCY';
  }>;
}
