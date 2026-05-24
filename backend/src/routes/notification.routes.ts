import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../controllers/notification.controller';

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

notificationRoutes.get('/', getNotifications);
notificationRoutes.patch('/:id/read', markAsRead);
notificationRoutes.patch('/mark-all-read', markAllAsRead);
notificationRoutes.delete('/:id', deleteNotification);
