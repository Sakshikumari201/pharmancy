import { Router } from 'express';
import { AdjustmentController } from '../controllers/adjustment.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { adjustStockSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

router.get('/adjustments', authenticateToken, AdjustmentController.listAdjustments);
router.get('/movements', authenticateToken, AdjustmentController.listMovements);

// Applying adjustments/returns requires PHARMACIST or ADMIN role
router.post(
  '/',
  authenticateToken,
  requireRole([Role.ADMIN, Role.PHARMACIST]),
  validateRequest(adjustStockSchema),
  AdjustmentController.adjust
);

export default router;
