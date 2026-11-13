import { Request, Response, NextFunction } from 'express';
import { MedicineService } from '../services/medicine.service';

export class MedicineController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, categoryId, stockFilter, prescription, page, limit } = req.query;
      const result = await MedicineService.getMedicines({
        search: search as string,
        categoryId: categoryId as string,
        stockFilter: stockFilter as any,
        prescription: prescription !== undefined ? prescription === 'true' : undefined,
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
      const medicine = await MedicineService.getMedicineById(req.params.id as string);
      res.json({ success: true, data: medicine });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const medicine = await MedicineService.createMedicine(req.body);
      res.status(201).json({
        success: true,
        message: 'Medicine added to catalogue',
        data: medicine
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const medicine = await MedicineService.updateMedicine(req.params.id as string, req.body);
      res.json({
        success: true,
        message: 'Medicine details updated',
        data: medicine
      });
    } catch (error) {
      next(error);
    }
  }

  static async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await MedicineService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description } = req.body;
      const category = await MedicineService.createCategory(name, description);
      res.status(201).json({
        success: true,
        message: 'Category created',
        data: category
      });
    } catch (error) {
      next(error);
    }
  }
}
