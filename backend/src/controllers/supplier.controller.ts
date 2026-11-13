import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplier.service';

export class SupplierController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search } = req.query;
      const suppliers = await SupplierService.getSuppliers(search as string);
      res.json({ success: true, data: suppliers });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const supplier = await SupplierService.getSupplierById(req.params.id as string);
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const supplier = await SupplierService.createSupplier(req.body);
      res.status(201).json({
        success: true,
        message: 'Supplier added successfully',
        data: supplier
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const supplier = await SupplierService.updateSupplier(req.params.id as string, req.body);
      res.json({
        success: true,
        message: 'Supplier updated successfully',
        data: supplier
      });
    } catch (error) {
      next(error);
    }
  }
}
