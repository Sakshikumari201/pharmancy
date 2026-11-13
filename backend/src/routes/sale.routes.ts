import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createSaleSchema } from '../validators';

const router = Router();

// All authenticated roles (ADMIN, PHARMACIST, CASHIER) can process and view sales
router.post('/', authenticateToken, validateRequest(createSaleSchema), SaleController.create);
router.get('/', authenticateToken, SaleController.list);
router.get('/:id', authenticateToken, SaleController.getById);

export default router;
