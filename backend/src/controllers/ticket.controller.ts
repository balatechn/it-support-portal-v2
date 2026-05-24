import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { Priority, Role, TicketCategory, TicketStatus } from '@prisma/client';
import { notifyUsers } from '../services/socket.service';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';

const TICKET_PREFIX = 'TKT';
const generateTicketId = () => `${TICKET_PREFIX}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

const getSLADeadline = async (priority: Priority): Promise<Date> => {
  const sla = await prisma.sLAConfig.findUnique({ where: { priority } });
  const minutes = sla?.resolutionTime || 1440;
  return new Date(Date.now() + minutes * 60 * 1000);
};

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, priority = Priority.MEDIUM, category = TicketCategory.OTHER, deviceName, ipAddress, browserInfo, osInfo, relatedAssetId, tags } = req.body;
  try {
    const slaDeadline = await getSLADeadline(priority);
    const ticket = await prisma.ticket.create({
      data: {
        ticketId: generateTicketId(),
        title, description, priority, category,
        deviceName, ipAddress, browserInfo, osInfo,
        relatedAssetId, tags: tags || [],
        createdById: req.user!.id,
        departmentId: (await prisma.user.findUnique({ where: { id: req.user!.id } }))?.departmentId || undefined,
        slaDeadline,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } }, assignedTo: { select: { id: true, name: true, email: true } }, department: true },
    });

    // Auto-assign to available engineer
    const engineer = await prisma.user.findFirst({ where: { role: Role.ENGINEER, isActive: true }, orderBy: { assignedTickets: { _count: 'asc' } } });
    if (engineer) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { assignedToId: engineer.id } });
      await emailService.sendTicketCreated(req.user!.email, ticket.ticketId, ticket.title).catch(() => {});
    }

    await prisma.ticketHistory.create({ data: { ticketId: ticket.id, field: 'status', newValue: TicketStatus.OPEN, changedBy: req.user!.id } });
    notifyUsers([req.user!.id], 'ticket:created', { ticketId: ticket.id });

    res.status(201).json(ticket);
  } catch (err) {
    logger.error('Create ticket error:', err);
    res.status(500).json({ message: 'Failed to create ticket' });
  }
};

export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, priority, category, search, page = '1', limit = '20', assignedToMe } = req.query as Record<string, string>;
  const take = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * take;

  const where: Record<string, unknown> = {};
  if (req.user!.role === Role.USER) where.createdById = req.user!.id;
  if (req.user!.role === Role.ENGINEER && assignedToMe === 'true') where.assignedToId = req.user!.id;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;
  if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { ticketId: { contains: search, mode: 'insensitive' } }];

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where, skip, take,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        department: true,
        _count: { select: { messages: true, attachments: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
};

export const getTicketById = async (req: AuthRequest, res: Response): Promise<void> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true, avatarUrl: true, department: true } },
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      department: true,
      messages: { include: { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      attachments: true,
      relatedAsset: true,
      _count: { select: { messages: true } },
    },
  });
  if (!ticket) { res.status(404).json({ message: 'Ticket not found' }); return; }
  if (req.user!.role === Role.USER && ticket.createdById !== req.user!.id) { res.status(403).json({ message: 'Access denied' }); return; }
  res.json(ticket);
};

export const updateTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, priority, category, title, description, tags } = req.body;
  try {
    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ message: 'Ticket not found' }); return; }

    const changes: string[] = [];
    if (status && status !== existing.status) changes.push(`status: ${existing.status} → ${status}`);
    if (priority && priority !== existing.priority) changes.push(`priority: ${existing.priority} → ${priority}`);

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status, ...(status === TicketStatus.RESOLVED && { resolvedAt: new Date() }), ...(status === TicketStatus.CLOSED && { closedAt: new Date() }) }),
        ...(priority && { priority }),
        ...(category && { category }),
        ...(title && { title }),
        ...(description && { description }),
        ...(tags && { tags }),
      },
      include: { createdBy: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
    });

    if (changes.length) {
      for (const change of changes) {
        const [field, values] = change.split(': ');
        const [oldValue, newValue] = values.split(' → ');
        await prisma.ticketHistory.create({ data: { ticketId: ticket.id, field, oldValue, newValue, changedBy: req.user!.id } });
      }
    }

    notifyUsers([ticket.createdById, ticket.assignedToId].filter(Boolean) as string[], 'ticket:updated', { ticketId: ticket.id, changes });
    res.json(ticket);
  } catch (err) {
    logger.error('Update ticket error:', err);
    res.status(500).json({ message: 'Failed to update ticket' });
  }
};

export const assignTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { engineerId } = req.body;
  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: { assignedToId: engineerId, status: TicketStatus.IN_PROGRESS },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });
  await prisma.ticketHistory.create({ data: { ticketId: ticket.id, field: 'assignedTo', newValue: engineerId, changedBy: req.user!.id } });
  notifyUsers([engineerId], 'ticket:assigned', { ticketId: ticket.id });
  res.json(ticket);
};

export const claimTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const engineerId = req.user!.id;
  try {
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { assignedToId: engineerId, status: TicketStatus.IN_PROGRESS },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    await prisma.ticketHistory.create({ data: { ticketId: ticket.id, field: 'assignedTo', newValue: engineerId, changedBy: engineerId } });
    notifyUsers([engineerId], 'ticket:assigned', { ticketId: ticket.id });
    res.json(ticket);
  } catch {
    res.status(404).json({ message: 'Ticket not found' });
  }
};

export const closeTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: { status: TicketStatus.CLOSED, closedAt: new Date() },
  });
  res.json(ticket);
};

export const reopenTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ message: 'Ticket not found' }); return; }
  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: { status: TicketStatus.REOPENED, reopenCount: { increment: 1 }, resolvedAt: null, closedAt: null },
  });
  res.json(ticket);
};

export const addInternalNote = async (req: AuthRequest, res: Response): Promise<void> => {
  const note = await prisma.internalNote.create({
    data: { ticketId: req.params.id, content: req.body.content, authorId: req.user!.id },
  });
  res.status(201).json(note);
};

export const addAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) { res.status(400).json({ message: 'No files uploaded' }); return; }
  const attachments = await Promise.all(files.map(f =>
    prisma.attachment.create({
      data: { ticketId: req.params.id, fileName: f.originalname, fileType: f.mimetype, fileSize: f.size, filePath: f.filename, uploadedBy: req.user!.id },
    })
  ));
  res.status(201).json(attachments);
};

export const getTicketHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const history = await prisma.ticketHistory.findMany({ where: { ticketId: req.params.id }, orderBy: { createdAt: 'desc' } });
  res.json(history);
};

export const deleteTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.ticket.delete({ where: { id: req.params.id } });
  res.json({ message: 'Ticket deleted' });
};
