import { Router } from 'express';
import { BatchController } from '../controllers/batch.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateToken, BatchController.list);
router.get('/medicine/:medicineId/available', authenticateToken, BatchController.getAvailableForMedicine);
router.patch(
  '/:id/toggle-block',
  authenticateToken,
  requireRole([Role.ADMIN, Role.PHARMACIST]),
  BatchController.toggleBlock
);

export default router;
