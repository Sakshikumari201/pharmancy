import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';

export class ReportController {
  static async getSalesReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const report = await ReportService.getSalesReport({
        startDate: startDate as string,
        endDate: endDate as string
      });
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async getStockValuationReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ReportService.getStockValuationReport();
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async getExpiryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ReportService.getExpiryReport();
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async getReconciliationReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { medicineId, startDate, endDate } = req.query;
      const report = await ReportService.getReconciliationReport({
        medicineId: medicineId as string,
        startDate: startDate as string,
        endDate: endDate as string
      });
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await ReportService.getDashboardMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  }
}
