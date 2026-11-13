import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createPurchaseSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateToken, PurchaseController.list);
router.get('/:id', authenticateToken, PurchaseController.getById);
router.post(
  '/',
  authenticateToken,
  requireRole([Role.ADMIN, Role.PHARMACIST]),
  validateRequest(createPurchaseSchema),
  PurchaseController.create
);

export default router;
