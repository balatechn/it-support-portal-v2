import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { getDailyReport, getWeeklyReport, exportReport } from '../controllers/report.controller';

export const reportRoutes = Router();

reportRoutes.use(authenticate, authorize(Role.ADMIN, Role.SUPER_ADMIN));

reportRoutes.get('/daily', getDailyReport);
reportRoutes.get('/weekly', getWeeklyReport);
reportRoutes.get('/export', exportReport);
