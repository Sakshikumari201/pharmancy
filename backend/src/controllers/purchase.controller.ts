import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from '../services/purchase.service';

export class PurchaseController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receivedById = req.user!.id;
      const purchase = await PurchaseService.createPurchase(req.body, receivedById);
      res.status(201).json({
        success: true,
        message: 'Stock received and batches updated successfully',
        data: purchase
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, supplierId, page, limit } = req.query;
      const result = await PurchaseService.getPurchases({
        search: search as string,
        supplierId: supplierId as string,
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
      const purchase = await PurchaseService.getPurchaseById(req.params.id as string);
      res.json({ success: true, data: purchase });
    } catch (error) {
      next(error);
    }
  }
}
