import { Router } from 'express';
import { MedicineController } from '../controllers/medicine.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createMedicineSchema, updateMedicineSchema, createCategorySchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

// Categories
router.get('/categories', authenticateToken, MedicineController.listCategories);
router.post(
  '/categories',
  authenticateToken,
  requireRole([Role.ADMIN, Role.PHARMACIST]),
  validateRequest(createCategorySchema),
  MedicineController.createCategory
);

// Medicines
router.get('/', authenticateToken, MedicineController.list);
router.get('/:id', authenticateToken, MedicineController.getById);
router.post(
  '/',
  authenticateToken,
  requireRole([Role.ADMIN, Role.PHARMACIST]),
  validateRequest(createMedicineSchema),
  MedicineController.create
);
router.put(
  '/:id',
  authenticateToken,
  requireRole([Role.ADMIN, Role.PHARMACIST]),
  validateRequest(updateMedicineSchema),
  MedicineController.update
);

export default router;
