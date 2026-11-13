import { Router } from 'express';
import authRoutes from './auth.routes';
import medicineRoutes from './medicine.routes';
import batchRoutes from './batch.routes';
import saleRoutes from './sale.routes';
import purchaseRoutes from './purchase.routes';
import adjustmentRoutes from './adjustment.routes';
import reportRoutes from './report.routes';
import supplierRoutes from './supplier.routes';
import auditRoutes from './audit.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/medicines', medicineRoutes);
router.use('/batches', batchRoutes);
router.use('/sales', saleRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/stock', adjustmentRoutes);
router.use('/reports', reportRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/audit', auditRoutes);

export default router;
