import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';

const signTokens = (userId: string, email: string, role: string, name: string) => {
  const access = jwt.sign({ id: userId, email, role, name }, process.env.JWT_SECRET!, { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any });
  const refresh = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any });
  return { access, refresh };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, mobile, departmentId } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ message: 'Email already registered' }); return; }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, mobile, departmentId },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });
    const tokens = signTokens(user.id, user.email, user.role, user.name);
    await prisma.refreshToken.create({ data: { token: tokens.refresh, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    res.status(201).json({ user, ...tokens });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress;
  try {
    const user = await prisma.user.findUnique({ where: { email }, include: { department: true } });
    if (!user || !user.isActive) { res.status(401).json({ message: 'Invalid credentials' }); return; }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { res.status(401).json({ message: 'Invalid credentials' }); return; }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } });
    const tokens = signTokens(user.id, user.email, user.role, user.name);
    await prisma.refreshToken.create({ data: { token: tokens.refresh, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

    const { password: _pw, twoFactorSecret: _2fa, passwordResetToken: _prt, ...safeUser } = user;
    res.json({ user: safeUser, ...tokens });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) { res.status(401).json({ message: 'Refresh token required' }); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };
    const stored = await prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
    if (!stored || stored.userId !== decoded.id || stored.expiresAt < new Date()) {
      res.status(401).json({ message: 'Invalid refresh token' }); return;
    }
    const { user } = stored;
    const tokens = signTokens(user.id, user.email, user.role, user.name);
    await prisma.refreshToken.delete({ where: { token } });
    await prisma.refreshToken.create({ data: { token: tokens.refresh, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    res.json(tokens);
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (token) await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
  res.json({ message: 'Logged out' });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { res.json({ message: 'If that email exists, a reset link has been sent.' }); return; }

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: user.id }, data: { passwordResetToken: token, passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000) } });
    await emailService.sendPasswordReset(email, user.name, token);
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to send reset email' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;
  try {
    const user = await prisma.user.findFirst({ where: { passwordResetToken: token, passwordResetExpiry: { gt: new Date() } } });
    if (!user) { res.status(400).json({ message: 'Invalid or expired reset token' }); return; }
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed, passwordResetToken: null, passwordResetExpiry: null } });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    logger.error('Reset password error:', err);
    res.status(500).json({ message: 'Password reset failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, mobile: true, role: true, department: true, avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true },
  });
  res.json(user);
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) { res.status(400).json({ message: 'Current password is incorrect' }); return; }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error('Change password error:', err);
    res.status(500).json({ message: 'Failed to change password' });
  }
};
