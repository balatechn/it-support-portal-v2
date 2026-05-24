import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { sendMessage, getChatHistory, startAIChat, escalateToHuman, getAISuggestion } from '../controllers/chat.controller';

export const chatRoutes = Router();

chatRoutes.use(authenticate);

chatRoutes.post('/ai', [body('message').trim().notEmpty()], validate, startAIChat);
chatRoutes.post('/tickets/:ticketId/messages', [body('content').trim().notEmpty()], validate, sendMessage);
chatRoutes.get('/tickets/:ticketId/messages', getChatHistory);
chatRoutes.post('/tickets/:ticketId/escalate', escalateToHuman);
chatRoutes.post('/tickets/:ticketId/ai-suggestion', getAISuggestion);
