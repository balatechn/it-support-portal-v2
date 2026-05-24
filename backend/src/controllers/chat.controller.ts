import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { MessageType, TicketStatus } from '@prisma/client';
import { aiService } from '../services/ai.service';
import { notifyUsers } from '../services/socket.service';
import { logger } from '../utils/logger';

export const startAIChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, sessionId, history = [] } = req.body;
  try {
    const result = await aiService.chat(message, history, req.user!);
    res.json(result);
  } catch (err) {
    logger.error('AI chat error:', err);
    res.status(500).json({ message: 'AI service unavailable', fallback: true });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content, type = MessageType.USER } = req.body;
  const { ticketId } = req.params;
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) { res.status(404).json({ message: 'Ticket not found' }); return; }

    const message = await prisma.message.create({
      data: { ticketId, content, type, senderId: req.user!.id },
      include: { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    });

    // Notify relevant parties
    const notifyIds = [ticket.createdById, ticket.assignedToId].filter(Boolean).filter(id => id !== req.user!.id) as string[];
    notifyUsers(notifyIds, 'message:new', { ticketId, message });

    // Update ticket status
    if (ticket.status === TicketStatus.PENDING_USER) {
      await prisma.ticket.update({ where: { id: ticketId }, data: { status: TicketStatus.IN_PROGRESS } });
    }

    res.status(201).json(message);
  } catch (err) {
    logger.error('Send message error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const messages = await prisma.message.findMany({
    where: { ticketId: req.params.ticketId },
    include: { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
};

export const escalateToHuman = async (req: AuthRequest, res: Response): Promise<void> => {
  const { ticketId } = req.params;
  try {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.ESCALATED },
    });

    await prisma.message.create({
      data: { ticketId, content: '🔔 This conversation has been escalated to a human IT support engineer. An engineer will join shortly.', type: MessageType.SYSTEM },
    });

    notifyUsers([], 'ticket:escalated', { ticketId }, true); // broadcast to all engineers
    res.json(ticket);
  } catch (err) {
    logger.error('Escalate error:', err);
    res.status(500).json({ message: 'Escalation failed' });
  }
};

export const getAISuggestion = async (req: AuthRequest, res: Response): Promise<void> => {
  const { ticketId } = req.params;
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { messages: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!ticket) { res.status(404).json({ message: 'Ticket not found' }); return; }
    const suggestion = await aiService.getSuggestedReply(ticket);
    res.json({ suggestion });
  } catch (err) {
    logger.error('AI suggestion error:', err);
    res.status(500).json({ message: 'Could not generate suggestion' });
  }
};
