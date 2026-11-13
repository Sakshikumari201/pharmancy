import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createSupplierSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateToken, SupplierController.list);
router.get('/:id', authenticateToken, SupplierController.getById);
router.post(
  '/',
  authenticateToken,
  requireRole([Role.ADMIN, Role.PHARMACIST]),
  validateRequest(createSupplierSchema),
  SupplierController.create
);
router.put(
  '/:id',
  authenticateToken,
  requireRole([Role.ADMIN, Role.PHARMACIST]),
  SupplierController.update
);

export default router;
