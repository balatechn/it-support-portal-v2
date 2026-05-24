import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { TicketStatus } from '@prisma/client';

export const getDailyReport = async (_req: AuthRequest, res: Response): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [created, resolved, closed, open, escalated] = await Promise.all([
    prisma.ticket.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.ticket.count({ where: { resolvedAt: { gte: today, lt: tomorrow } } }),
    prisma.ticket.count({ where: { closedAt: { gte: today, lt: tomorrow } } }),
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { status: TicketStatus.ESCALATED } }),
  ]);

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: today, lt: tomorrow } },
    select: { ticketId: true, title: true, priority: true, status: true, category: true, createdBy: { select: { name: true } }, assignedTo: { select: { name: true } }, createdAt: true },
    orderBy: { priority: 'desc' },
  });

  res.json({ date: today.toISOString().split('T')[0], summary: { created, resolved, closed, open, escalated }, tickets });
};

export const getWeeklyReport = async (_req: AuthRequest, res: Response): Promise<void> => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { ticketId: true, title: true, priority: true, status: true, category: true, createdAt: true, resolvedAt: true, slaBreach: true, aiResolved: true },
  });

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let totalResolutionTime = 0;
  let resolvedCount = 0;

  for (const t of tickets) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    if (t.resolvedAt) {
      totalResolutionTime += (t.resolvedAt.getTime() - t.createdAt.getTime()) / (1000 * 60);
      resolvedCount++;
    }
  }

  res.json({
    period: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
    total: tickets.length,
    byStatus,
    byPriority,
    avgResolutionTime: resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0,
    slaBreaches: tickets.filter(t => t.slaBreach).length,
    aiResolved: tickets.filter(t => t.aiResolved).length,
  });
};

export const exportReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type = 'daily' } = req.query as { type: string };
  // Returns JSON for frontend to convert to PDF/Excel
  if (type === 'daily') return getDailyReport(req, res);
  return getWeeklyReport(req, res);
};
