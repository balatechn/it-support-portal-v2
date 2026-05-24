import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { register, login, refreshToken, logout, forgotPassword, resetPassword, getMe, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

export const authRoutes = Router();

authRoutes.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('mobile').optional().isMobilePhone('any'),
], validate, register);

authRoutes.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, login);

authRoutes.post('/refresh', refreshToken);
authRoutes.post('/logout', authenticate, logout);
authRoutes.post('/forgot-password', [body('email').isEmail().normalizeEmail()], validate, forgotPassword);
authRoutes.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
], validate, resetPassword);
authRoutes.get('/me', authenticate, getMe);
authRoutes.put('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], validate, changePassword);
