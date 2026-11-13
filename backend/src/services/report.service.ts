import { MovementType } from '@prisma/client';
import prisma from '../lib/prisma';

export class ReportService {
  static async getSalesReport(params: { startDate?: string; endDate?: string }) {
    const where: any = {};
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            medicine: { select: { id: true, name: true, categoryId: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const totalSalesCount = sales.length;
    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let totalDiscountsGiven = 0;
    let totalCostOfGoods = 0;

    const paymentBreakdown: Record<string, { count: number; total: number }> = {
      CASH: { count: 0, total: 0 },
      CARD: { count: 0, total: 0 },
      UPI: { count: 0, total: 0 }
    };

    const medicineSalesMap: Record<
      string,
      { id: string; name: string; quantitySold: number; totalRevenue: number; profit: number }
    > = {};

    // Grouping by date for trend chart
    const dailyTrendMap: Record<string, { date: string; revenue: number; salesCount: number; profit: number }> = {};

    for (const sale of sales) {
      totalRevenue += sale.grandTotal;
      totalTaxCollected += sale.taxAmount;
      totalDiscountsGiven += sale.discountAmount;

      if (paymentBreakdown[sale.paymentMethod]) {
        paymentBreakdown[sale.paymentMethod].count += 1;
        paymentBreakdown[sale.paymentMethod].total += sale.grandTotal;
      }

      const dateKey = sale.createdAt.toISOString().split('T')[0];
      if (!dailyTrendMap[dateKey]) {
        dailyTrendMap[dateKey] = { date: dateKey, revenue: 0, salesCount: 0, profit: 0 };
      }
      dailyTrendMap[dateKey].revenue += sale.grandTotal;
      dailyTrendMap[dateKey].salesCount += 1;

      for (const item of sale.items) {
        const cost = item.quantity * item.purchasePriceSnapshot;
        totalCostOfGoods += cost;
        const itemProfit = item.subtotal - cost;

        dailyTrendMap[dateKey].profit += itemProfit;

        if (!medicineSalesMap[item.medicineId]) {
          medicineSalesMap[item.medicineId] = {
            id: item.medicineId,
            name: item.medicine.name,
            quantitySold: 0,
            totalRevenue: 0,
            profit: 0
          };
        }
        medicineSalesMap[item.medicineId].quantitySold += item.quantity;
        medicineSalesMap[item.medicineId].totalRevenue += item.subtotal;
        medicineSalesMap[item.medicineId].profit += itemProfit;
      }
    }

    const netSales = totalRevenue - totalTaxCollected;
    const grossProfit = Number((netSales - totalCostOfGoods).toFixed(2));
    const profitMargin = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(2)) : 0;

    const topSellingMedicines = Object.values(medicineSalesMap)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    return {
      summary: {
        totalSalesCount,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        netSales: Number(netSales.toFixed(2)),
        totalCostOfGoods: Number(totalCostOfGoods.toFixed(2)),
        grossProfit,
        profitMargin,
        totalTaxCollected: Number(totalTaxCollected.toFixed(2)),
        totalDiscountsGiven: Number(totalDiscountsGiven.toFixed(2))
      },
      paymentBreakdown,
      topSellingMedicines,
      dailyTrend: Object.values(dailyTrendMap).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  static async getStockValuationReport() {
    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' }
        }
      }
    });

    let totalUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const categoryValuationMap: Record<
      string,
      { categoryName: string; units: number; costValuation: number; retailValuation: number }
    > = {};

    const items = medicines.map((m) => {
      let medCostValuation = 0;
      let medRetailValuation = 0;
      let medUnits = 0;

      for (const b of m.batches) {
        medUnits += b.quantity;
        medCostValuation += b.quantity * b.purchasePrice;
        medRetailValuation += b.quantity * b.salePrice;
      }

      totalUnits += medUnits;
      totalCostValuation += medCostValuation;
      totalRetailValuation += medRetailValuation;

      const catName = m.category.name;
      if (!categoryValuationMap[catName]) {
        categoryValuationMap[catName] = {
          categoryName: catName,
          units: 0,
          costValuation: 0,
          retailValuation: 0
        };
      }
      categoryValuationMap[catName].units += medUnits;
      categoryValuationMap[catName].costValuation += medCostValuation;
      categoryValuationMap[catName].retailValuation += medRetailValuation;

      return {
        id: m.id,
        name: m.name,
        sku: m.sku,
        category: m.category.name,
        unit: m.unit,
        totalStock: medUnits,
        batchCount: m.batches.length,
        costValuation: Number(medCostValuation.toFixed(2)),
        retailValuation: Number(medRetailValuation.toFixed(2)),
        potentialProfit: Number((medRetailValuation - medCostValuation).toFixed(2))
      };
    });

    const potentialGrossProfit = Number((totalRetailValuation - totalCostValuation).toFixed(2));
    const potentialMargin =
      totalRetailValuation > 0 ? Number(((potentialGrossProfit / totalRetailValuation) * 100).toFixed(2)) : 0;

    return {
      summary: {
        totalMedicines: medicines.length,
        totalUnits,
        totalCostValuation: Number(totalCostValuation.toFixed(2)),
        totalRetailValuation: Number(totalRetailValuation.toFixed(2)),
        potentialGrossProfit,
        potentialMargin
      },
      categoryValuation: Object.values(categoryValuationMap),
      items: items.sort((a, b) => b.costValuation - a.costValuation)
    };
  }

  static async getExpiryReport() {
    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date(now);
    sixtyDays.setDate(sixtyDays.getDate() + 60);
    const ninetyDays = new Date(now);
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const batches = await prisma.batch.findMany({
      where: {
        quantity: { gt: 0 }
      },
      include: {
        medicine: { select: { id: true, name: true, sku: true, unit: true, location: true } },
        supplier: { select: { id: true, name: true, phone: true } }
      },
      orderBy: { expiryDate: 'asc' }
    });

    const expired: any[] = [];
    const within30Days: any[] = [];
    const within60Days: any[] = [];
    const within90Days: any[] = [];

    let totalExpiredLoss = 0;
    let totalAtRiskCost = 0;

    for (const b of batches) {
      const daysDiff = Math.ceil((b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const costValue = Number((b.quantity * b.purchasePrice).toFixed(2));
      const retailValue = Number((b.quantity * b.salePrice).toFixed(2));

      const itemData = {
        id: b.id,
        batchNumber: b.batchNumber,
        medicineName: b.medicine.name,
        sku: b.medicine.sku,
        unit: b.medicine.unit,
        rackLocation: b.rackLocation || b.medicine.location,
        quantity: b.quantity,
        purchasePrice: b.purchasePrice,
        salePrice: b.salePrice,
        costValue,
        retailValue,
        expiryDate: b.expiryDate,
        daysToExpiry: daysDiff,
        supplierName: b.supplier?.name || 'N/A'
      };

      if (b.expiryDate <= now) {
        expired.push(itemData);
        totalExpiredLoss += costValue;
      } else if (b.expiryDate <= thirtyDays) {
        within30Days.push(itemData);
        totalAtRiskCost += costValue;
      } else if (b.expiryDate <= sixtyDays) {
        within60Days.push(itemData);
        totalAtRiskCost += costValue;
      } else if (b.expiryDate <= ninetyDays) {
        within90Days.push(itemData);
        totalAtRiskCost += costValue;
      }
    }

    return {
      summary: {
        totalExpiredItems: expired.length,
        totalExpiredLoss: Number(totalExpiredLoss.toFixed(2)),
        totalNearExpiryItems: within30Days.length + within60Days.length + within90Days.length,
        totalAtRiskCost: Number(totalAtRiskCost.toFixed(2))
      },
      expired,
      within30Days,
      within60Days,
      within90Days
    };
  }

  // Acceptance Test #5: The stock report reconciles with opening stock, purchases, sales and adjustments
  static async getReconciliationReport(params: {
    medicineId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const medicinesWhere: any = { isActive: true };
    if (params.medicineId) {
      medicinesWhere.id = params.medicineId;
    }

    const medicines = await prisma.medicine.findMany({
      where: medicinesWhere,
      include: {
        batches: true
      },
      orderBy: { name: 'asc' }
    });

    const startDate = params.startDate ? new Date(params.startDate) : null;
    const endDate = params.endDate ? new Date(params.endDate) : null;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    const reconciliationRows = [];

    for (const med of medicines) {
      // Current actual stock in DB
      const currentActualStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);

      // Movements before startDate (to compute Opening Stock)
      let openingStock = 0;
      if (startDate) {
        const priorMovements = await prisma.stockMovement.findMany({
          where: {
            medicineId: med.id,
            createdAt: { lt: startDate }
          }
        });
        openingStock = priorMovements.reduce((acc, m) => acc + m.quantityChange, 0);
      } else {
        // If no startDate provided, opening stock is 0 and we calculate from the beginning of all records
        openingStock = 0;
      }

      // Movements in period
      const periodMovementWhere: any = { medicineId: med.id };
      if (startDate || endDate) {
        periodMovementWhere.createdAt = {};
        if (startDate) periodMovementWhere.createdAt.gte = startDate;
        if (endDate) periodMovementWhere.createdAt.lte = endDate;
      }

      const periodMovements = await prisma.stockMovement.findMany({
        where: periodMovementWhere,
        orderBy: { createdAt: 'asc' }
      });

      let purchasesIn = 0;
      let salesOut = 0;
      let returnsIn = 0;
      let adjustmentsDelta = 0;
      let expiredDisposal = 0;

      for (const m of periodMovements) {
        switch (m.type) {
          case MovementType.PURCHASE:
            purchasesIn += m.quantityChange;
            break;
          case MovementType.SALE:
            salesOut += Math.abs(m.quantityChange); // quantityChange is negative for sales
            break;
          case MovementType.RETURN:
            returnsIn += m.quantityChange;
            break;
          case MovementType.ADJUSTMENT:
            adjustmentsDelta += m.quantityChange;
            break;
          case MovementType.EXPIRED_DISPOSAL:
            expiredDisposal += Math.abs(m.quantityChange);
            break;
        }
      }

      // Formula: Closing Stock = Opening Stock + Purchases - Sales + Returns + Adjustments - ExpiredDisposal
      const calculatedClosingStock =
        openingStock + purchasesIn - salesOut + returnsIn + adjustmentsDelta - expiredDisposal;

      // Variance is zero if perfectly reconciled!
      const variance = currentActualStock - calculatedClosingStock;

      reconciliationRows.push({
        medicineId: med.id,
        medicineName: med.name,
        sku: med.sku,
        unit: med.unit,
        openingStock,
        purchasesIn,
        salesOut,
        returnsIn,
        adjustmentsDelta,
        expiredDisposal,
        calculatedClosingStock,
        currentActualStock,
        variance,
        isReconciled: variance === 0,
        movementsCount: periodMovements.length
      });
    }

    const allReconciled = reconciliationRows.every((r) => r.isReconciled);

    return {
      period: {
        startDate: params.startDate || 'Beginning of Records',
        endDate: params.endDate || 'Current Date'
      },
      auditSummary: {
        totalMedicinesEvaluated: reconciliationRows.length,
        fullyReconciledCount: reconciliationRows.filter((r) => r.isReconciled).length,
        discrepanciesCount: reconciliationRows.filter((r) => !r.isReconciled).length,
        isAuditPassed: allReconciled
      },
      items: reconciliationRows
    };
  }

  static async getDashboardMetrics() {
    const now = new Date();
    const nearExpiryDate = new Date(now);
    nearExpiryDate.setDate(nearExpiryDate.getDate() + 60);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalMedicines,
      medicinesList,
      expiredBatchesCount,
      nearExpiryBatchesCount,
      todaySales,
      totalSalesCount,
      recentSales,
      recentMovements
    ] = await Promise.all([
      prisma.medicine.count({ where: { isActive: true } }),
      prisma.medicine.findMany({
        where: { isActive: true },
        select: { id: true, totalStock: true, minStockLevel: true }
      }),
      prisma.batch.count({
        where: {
          expiryDate: { lte: now },
          quantity: { gt: 0 }
        }
      }),
      prisma.batch.count({
        where: {
          expiryDate: { gt: now, lte: nearExpiryDate },
          quantity: { gt: 0 }
        }
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { grandTotal: true, subtotal: true }
      }),
      prisma.sale.count(),
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          cashier: { select: { name: true } },
          _count: { select: { items: true } }
        }
      }),
      prisma.stockMovement.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          medicine: { select: { name: true, unit: true } },
          batch: { select: { batchNumber: true } },
          performedBy: { select: { name: true } }
        }
      })
    ]);

    const lowStockCount = medicinesList.filter((m) => m.totalStock <= m.minStockLevel).length;
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);

    return {
      totalMedicines,
      lowStockCount,
      expiredBatchesCount,
      nearExpiryBatchesCount,
      todaySalesCount: todaySales.length,
      todayRevenue: Number(todayRevenue.toFixed(2)),
      totalSalesCount,
      recentSales,
      recentMovements
    };
  }
}
