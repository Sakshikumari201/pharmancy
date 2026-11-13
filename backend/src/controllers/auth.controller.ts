import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const result = await AuthService.login(email, password, ip);
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: req.user
    });
  }
}

export class UserController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await AuthService.listUsers();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const newUser = await AuthService.registerUser(req.body, adminId);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: newUser
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const updated = await AuthService.toggleUserStatus(id as string, adminId);
      res.json({
        success: true,
        message: `User account has been ${updated.isActive ? 'activated' : 'deactivated'}`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
}
