import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const getUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, mobile: true, role: true, department: true, isActive: true, lastLoginAt: true, createdAt: true, avatarUrl: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
};

export const getEngineers = async (_req: AuthRequest, res: Response): Promise<void> => {
  const engineers = await prisma.user.findMany({
    where: { role: { in: [Role.ENGINEER, Role.ADMIN, Role.SUPER_ADMIN] }, isActive: true },
    select: { id: true, name: true, email: true, avatarUrl: true, _count: { select: { assignedTickets: true } } },
  });
  res.json(engineers);
};

export const getDepartments = async (_req: AuthRequest, res: Response): Promise<void> => {
  const depts = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  res.json(depts);
};

export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  const dept = await prisma.department.create({ data: { name: req.body.name } });
  res.status(201).json(dept);
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, mobile: true, role: true, department: true, isActive: true, lastLoginAt: true, createdAt: true, avatarUrl: true },
  });
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json(user);
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, mobile, departmentId, avatarUrl } = req.body;
  if (req.user!.id !== req.params.id && ![Role.ADMIN, Role.SUPER_ADMIN].includes(req.user!.role)) {
    res.status(403).json({ message: 'Access denied' }); return;
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(mobile !== undefined && { mobile }), ...(departmentId && { departmentId }), ...(avatarUrl && { avatarUrl }) },
    select: { id: true, name: true, email: true, mobile: true, role: true, department: true, avatarUrl: true },
  });
  res.json(user);
};

export const deactivateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'User deactivated', id: user.id });
};
