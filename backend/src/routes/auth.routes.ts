import { Router } from 'express';
import { AuthController, UserController } from '../controllers/auth.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { loginSchema, registerUserSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

router.post('/login', validateRequest(loginSchema), AuthController.login);
router.get('/me', authenticateToken, AuthController.me);

// User Management (Admin only)
router.get('/users', authenticateToken, requireRole([Role.ADMIN]), UserController.list);
router.post('/users', authenticateToken, requireRole([Role.ADMIN]), validateRequest(registerUserSchema), UserController.register);
router.patch('/users/:id/toggle-status', authenticateToken, requireRole([Role.ADMIN]), UserController.toggleStatus);

export default router;
