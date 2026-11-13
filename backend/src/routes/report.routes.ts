import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Dashboard quick metrics: available to all logged in staff
router.get('/dashboard', authenticateToken, ReportController.getDashboardMetrics);

// Detailed reports: available to ADMIN and PHARMACIST
router.get('/sales', authenticateToken, requireRole([Role.ADMIN, Role.PHARMACIST]), ReportController.getSalesReport);
router.get('/valuation', authenticateToken, requireRole([Role.ADMIN, Role.PHARMACIST]), ReportController.getStockValuationReport);
router.get('/expiry', authenticateToken, requireRole([Role.ADMIN, Role.PHARMACIST]), ReportController.getExpiryReport);
router.get('/reconciliation', authenticateToken, requireRole([Role.ADMIN, Role.PHARMACIST]), ReportController.getReconciliationReport);

export default router;
