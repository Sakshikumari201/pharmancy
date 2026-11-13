import { Request, Response, NextFunction } from 'express';
import { SaleService } from '../services/sale.service';
import { PaymentMethod } from '@prisma/client';

export class SaleController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cashierId = req.user!.id;
      const sale = await SaleService.createSale(req.body, cashierId);
      res.status(201).json({
        success: true,
        message: 'Sale completed and invoice generated successfully',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, startDate, endDate, paymentMethod, cashierId, page, limit } = req.query;
      const result = await SaleService.getSales({
        search: search as string,
        startDate: startDate as string,
        endDate: endDate as string,
        paymentMethod: paymentMethod as PaymentMethod,
        cashierId: cashierId as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sale = await SaleService.getSaleById(req.params.id as string);
      res.json({ success: true, data: sale });
    } catch (error) {
      next(error);
    }
  }
}
