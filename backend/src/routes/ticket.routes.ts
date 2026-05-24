import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { Role } from '@prisma/client';
import {
  createTicket, getTickets, getTicketById, updateTicket,
  assignTicket, claimTicket, closeTicket, reopenTicket, addInternalNote,
  addAttachment, getTicketHistory, deleteTicket
} from '../controllers/ticket.controller';

export const ticketRoutes = Router();

ticketRoutes.use(authenticate);

ticketRoutes.get('/', [
  query('status').optional().isString(),
  query('priority').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, getTickets);

ticketRoutes.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
], validate, createTicket);

ticketRoutes.get('/:id', getTicketById);
ticketRoutes.patch('/:id', updateTicket);
ticketRoutes.post('/:id/assign', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.ENGINEER), assignTicket);
ticketRoutes.post('/:id/claim', authorize(Role.ENGINEER, Role.ADMIN, Role.SUPER_ADMIN), claimTicket);
ticketRoutes.post('/:id/close', closeTicket);
ticketRoutes.post('/:id/reopen', reopenTicket);
ticketRoutes.post('/:id/notes', authorize(Role.ENGINEER, Role.ADMIN, Role.SUPER_ADMIN), [body('content').notEmpty()], validate, addInternalNote);
ticketRoutes.post('/:id/attachments', upload.array('files', 5), addAttachment);
ticketRoutes.get('/:id/history', getTicketHistory);
ticketRoutes.delete('/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN), deleteTicket);
