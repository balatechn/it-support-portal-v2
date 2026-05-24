import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { getDailyReport, getWeeklyReport, exportReport, getOverview, getEngineerStats } from '../controllers/report.controller';

export const reportRoutes = Router();

reportRoutes.use(authenticate);

reportRoutes.get('/daily', authorize(Role.ADMIN, Role.SUPER_ADMIN), getDailyReport);
reportRoutes.get('/weekly', authorize(Role.ADMIN, Role.SUPER_ADMIN), getWeeklyReport);
reportRoutes.get('/export', authorize(Role.ADMIN, Role.SUPER_ADMIN), exportReport);
reportRoutes.get('/overview', authorize(Role.ADMIN, Role.SUPER_ADMIN), getOverview);
reportRoutes.get('/engineer-stats', authorize(Role.ENGINEER, Role.ADMIN, Role.SUPER_ADMIN), getEngineerStats);
