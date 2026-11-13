import { Request, Response, NextFunction } from 'express';
import { BatchService } from '../services/batch.service';

export class BatchController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { medicineId, status, search } = req.query;
      const batches = await BatchService.getBatches({
        medicineId: medicineId as string,
        status: status as any,
        search: search as string
      });
      res.json({ success: true, data: batches });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableForMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batches = await BatchService.getAvailableBatchesForMedicine(req.params.medicineId as string);
      res.json({ success: true, data: batches });
    } catch (error) {
      next(error);
    }
  }

  static async toggleBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const userId = req.user?.id;
      const updated = await BatchService.toggleBatchBlock(id, reason, userId);
      res.json({
        success: true,
        message: `Batch status changed to ${updated.isBlocked ? 'Blocked/Quarantined' : 'Active'}`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
}
