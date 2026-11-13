import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export class AuditController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { action, entityType, userId, page, limit } = req.query;
      const pageNum = Math.max(1, page ? parseInt(page as string, 10) : 1);
      const limitNum = Math.max(1, Math.min(100, limit ? parseInt(limit as string, 10) : 30));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (action) where.action = action as string;
      if (entityType) where.entityType = entityType as string;
      if (userId) where.userId = userId as string;

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        })
      ]);

      res.json({
        success: true,
        data: {
          items: logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
