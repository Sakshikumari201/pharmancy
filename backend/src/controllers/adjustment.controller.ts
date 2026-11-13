import { Request, Response, NextFunction } from 'express';
import { AdjustmentService } from '../services/adjustment.service';
import { AdjustmentType, MovementType } from '@prisma/client';

export class AdjustmentController {
  static async adjust(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await AdjustmentService.adjustStock(req.body, userId);
      res.status(201).json({
        success: true,
        message: 'Stock adjustment applied and ledger updated',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async listAdjustments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { medicineId, batchId, type, page, limit } = req.query;
      const result = await AdjustmentService.getAdjustments({
        medicineId: medicineId as string,
        batchId: batchId as string,
        type: type as AdjustmentType,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { medicineId, batchId, type, startDate, endDate, page, limit } = req.query;
      const result = await AdjustmentService.getStockMovements({
        medicineId: medicineId as string,
        batchId: batchId as string,
        type: type as MovementType,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 30
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
