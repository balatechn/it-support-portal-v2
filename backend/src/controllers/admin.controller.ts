import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { Role, TicketStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

// In-memory settings store (persists for server lifetime)
let appSettings = {
  siteName: 'IT Support Portal',
  supportEmail: 'support@company.com',
  maxFileSize: 10,
  maintenanceMode: false,
  emailNotifications: true,
  autoAssign: true,
};

export const getDashboardStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));

  const [total, open, inProgress, resolved, closed, escalated, critical, slaBreached, todayCreated, aiResolved, activeUsers, resolvedToday, resolvedTickets] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
    prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
    prisma.ticket.count({ where: { status: TicketStatus.CLOSED } }),
    prisma.ticket.count({ where: { status: TicketStatus.ESCALATED } }),
    prisma.ticket.count({ where: { priority: 'CRITICAL', status: { notIn: [TicketStatus.CLOSED, TicketStatus.RESOLVED] } } }),
    prisma.ticket.count({ where: { slaBreach: true } }),
    prisma.ticket.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.ticket.count({ where: { aiResolved: true } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.ticket.count({ where: { resolvedAt: { gte: todayStart } } }),
    prisma.ticket.findMany({ where: { resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true }, take: 100, orderBy: { resolvedAt: 'desc' } }),
  ]);

  const totalResolved = resolved + closed;
  const aiResolutionRate = totalResolved > 0 ? Math.round((aiResolved / totalResolved) * 100) : 0;

  let avgResolutionHours = 0;
  if (resolvedTickets.length > 0) {
    const totalMs = resolvedTickets.reduce((sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0);
    avgResolutionHours = Math.round(totalMs / resolvedTickets.length / (1000 * 60 * 60));
  }

  res.json({
    // Original fields
    total, open, inProgress, resolved, closed, escalated, critical, slaBreached, todayCreated, aiResolved, aiResolutionRate,
    // Aliased fields for frontend compatibility
    totalTickets: total, openTickets: open, inProgressTickets: inProgress,
    resolvedToday, slaBreach: slaBreached, activeUsers, avgResolutionHours,
  });
};

export const getTicketTrends = async (_req: AuthRequest, res: Response): Promise<void> => {
  const days = 30;
  const start = new Date();
  start.setDate(start.getDate() - days);

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true, status: true, category: true, priority: true },
  });

  const byDay: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const t of tickets) {
    const day = t.createdAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  }

  res.json({
    daily: Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
  });
};

export const getEngineerWorkload = async (_req: AuthRequest, res: Response): Promise<void> => {
  const engineers = await prisma.user.findMany({
    where: { role: { in: [Role.ENGINEER, Role.ADMIN] }, isActive: true },
    select: {
      id: true, name: true, email: true, avatarUrl: true,
      _count: { select: { assignedTickets: true } },
    },
  });

  const withDetails = await Promise.all(engineers.map(async (e) => {
    const [open, critical] = await Promise.all([
      prisma.ticket.count({ where: { assignedToId: e.id, status: { notIn: [TicketStatus.CLOSED, TicketStatus.RESOLVED] } } }),
      prisma.ticket.count({ where: { assignedToId: e.id, priority: 'CRITICAL', status: { notIn: [TicketStatus.CLOSED, TicketStatus.RESOLVED] } } }),
    ]);
    return { ...e, openTickets: open, criticalTickets: critical };
  }));

  res.json(withDetails);
};

export const getSLAReport = async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const breached = await prisma.ticket.findMany({
    where: { slaDeadline: { lt: now }, status: { notIn: [TicketStatus.CLOSED, TicketStatus.RESOLVED] } },
    select: { id: true, ticketId: true, title: true, priority: true, slaDeadline: true, assignedTo: { select: { name: true } } },
    orderBy: { slaDeadline: 'asc' },
  });
  res.json({ breached, count: breached.length });
};

export const getTemplates = async (_req: AuthRequest, res: Response): Promise<void> => {
  const templates = await prisma.quickReplyTemplate.findMany({ where: { isGlobal: true }, orderBy: { title: 'asc' } });
  res.json(templates);
};

export const createTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  const template = await prisma.quickReplyTemplate.create({ data: { ...req.body, createdBy: req.user!.id } });
  res.status(201).json(template);
};

export const updateTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  const template = await prisma.quickReplyTemplate.update({ where: { id: req.params.id }, data: req.body });
  res.json(template);
};

export const deleteTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.quickReplyTemplate.delete({ where: { id: req.params.id } });
  res.json({ message: 'Template deleted' });
};

export const getSLAConfig = async (_req: AuthRequest, res: Response): Promise<void> => {
  const configs = await prisma.sLAConfig.findMany({ orderBy: { priority: 'asc' } });
  // Transform minutes to hours for frontend
  const transformed = configs.map(c => ({
    id: c.id,
    priority: c.priority,
    firstResponseHours: Math.round(c.responseTime / 60),
    resolutionHours: Math.round(c.resolutionTime / 60),
    escalationHours: Math.round(c.resolutionTime / 60 * 0.75), // 75% of resolution time
    responseTime: c.responseTime,
    resolutionTime: c.resolutionTime,
  }));
  res.json(transformed);
};

export const updateSLAConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const { configs } = req.body as { configs: Array<{ priority: string; responseTime: number; resolutionTime: number }> };
  const updated = await Promise.all(configs.map(c =>
    prisma.sLAConfig.upsert({ where: { priority: c.priority as any }, update: { responseTime: c.responseTime, resolutionTime: c.resolutionTime }, create: c as any })
  ));
  res.json(updated);
};

export const updateSLAConfigById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { firstResponseHours, resolutionHours } = req.body as { firstResponseHours: number; resolutionHours: number };
  try {
    const updated = await prisma.sLAConfig.update({
      where: { id: req.params.id },
      data: {
        responseTime: Math.round(firstResponseHours * 60),
        resolutionTime: Math.round(resolutionHours * 60),
      },
    });
    res.json({ ...updated, firstResponseHours, resolutionHours, escalationHours: Math.round(resolutionHours * 0.75) });
  } catch {
    res.status(404).json({ message: 'SLA config not found' });
  }
};

export const getSettings = (_req: AuthRequest, res: Response): void => {
  res.json(appSettings);
};

export const updateSettings = (req: AuthRequest, res: Response): void => {
  appSettings = { ...appSettings, ...req.body };
  res.json(appSettings);
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, role, page = '1', limit = '25' } = req.query as Record<string, string>;
  const take = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * take;

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
  ];

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true, lastLoginAt: true, createdAt: true, _count: { select: { createdTickets: true } } },
      orderBy: { createdAt: 'desc' },
      skip, take,
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
};

export const createUserByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role, departmentId, mobile } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ message: 'Email already exists' }); return; }
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role, departmentId, mobile },
    select: { id: true, name: true, email: true, role: true, department: true },
  });
  res.status(201).json(user);
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role }, select: { id: true, name: true, role: true } });
  res.json(user);
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, isActive } = req.body;
  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json(user);
  } catch {
    res.status(404).json({ message: 'User not found' });
  }
};
