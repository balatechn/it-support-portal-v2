import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { Role, TicketStatus } from '@prisma/client';

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
  const tickets = await prisma.ticket.findMany({
    select: { ticketId: true, title: true, status: true, priority: true, category: true, createdAt: true, resolvedAt: true, slaBreach: true, createdBy: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const header = 'Ticket ID,Title,Status,Priority,Category,Created By,Assigned To,Created At,Resolved At,SLA Breach';
  const rows = tickets.map(t => [
    t.ticketId,
    `"${t.title.replace(/"/g, '""')}"`,
    t.status,
    t.priority,
    t.category,
    t.createdBy?.name || '',
    t.assignedTo?.name || '',
    t.createdAt.toISOString().split('T')[0],
    t.resolvedAt ? t.resolvedAt.toISOString().split('T')[0] : '',
    t.slaBreach ? 'Yes' : 'No',
  ].join(','));

  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=tickets_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
};

export const getOverview = async (_req: AuthRequest, res: Response): Promise<void> => {
  const days = 30;
  const start = new Date();
  start.setDate(start.getDate() - days);

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true, resolvedAt: true, category: true, priority: true, status: true },
  });

  // Build daily trend
  const byDay: Record<string, { created: number; resolved: number }> = {};
  for (const t of tickets) {
    const day = t.createdAt.toISOString().split('T')[0];
    if (!byDay[day]) byDay[day] = { created: 0, resolved: 0 };
    byDay[day].created++;
    if (t.resolvedAt) {
      const rDay = t.resolvedAt.toISOString().split('T')[0];
      if (!byDay[rDay]) byDay[rDay] = { created: 0, resolved: 0 };
      byDay[rDay].resolved++;
    }
  }
  const trend = Object.entries(byDay).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));

  // Top categories
  const catCount: Record<string, number> = {};
  for (const t of tickets) catCount[t.category] = (catCount[t.category] || 0) + 1;
  const topCategories = Object.entries(catCount).map(([category, _count]) => ({ category, _count })).sort((a, b) => b._count - a._count).slice(0, 8);

  // Engineer performance
  const engineers = await prisma.user.findMany({
    where: { role: { in: [Role.ENGINEER, Role.ADMIN] }, isActive: true },
    select: { id: true, name: true },
  });
  const engineerPerf = await Promise.all(engineers.map(async e => {
    const resolved = await prisma.ticket.findMany({
      where: { assignedToId: e.id, resolvedAt: { gte: start } },
      select: { createdAt: true, resolvedAt: true },
    });
    const avgHours = resolved.length > 0
      ? Math.round(resolved.reduce((s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) / resolved.length / 3600000)
      : 0;
    return { name: e.name, resolved: resolved.length, avgHours };
  }));

  res.json({ trend, topCategories, engineerPerf });
};

export const getEngineerStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const engineerId = req.user!.id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [total, open, inProgress, escalated, resolvedToday, recentResolved] = await Promise.all([
    prisma.ticket.count({ where: { assignedToId: engineerId } }),
    prisma.ticket.count({ where: { assignedToId: engineerId, status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { assignedToId: engineerId, status: TicketStatus.IN_PROGRESS } }),
    prisma.ticket.count({ where: { assignedToId: engineerId, status: TicketStatus.ESCALATED } }),
    prisma.ticket.count({ where: { assignedToId: engineerId, resolvedAt: { gte: todayStart } } }),
    prisma.ticket.findMany({ where: { assignedToId: engineerId, resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true }, take: 50 }),
  ]);

  const avgResolutionHours = recentResolved.length > 0
    ? Math.round(recentResolved.reduce((s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) / recentResolved.length / 3600000)
    : 0;

  res.json({ total, open, inProgress, escalated, resolvedToday, avgResolutionHours });
};
