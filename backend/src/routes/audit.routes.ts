import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Only ADMIN and PHARMACIST can inspect full security/operational audit logs
router.get('/', authenticateToken, requireRole([Role.ADMIN, Role.PHARMACIST]), AuditController.list);

export default router;
