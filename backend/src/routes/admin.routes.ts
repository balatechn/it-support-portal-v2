import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { getDashboardStats, getTicketTrends, getEngineerWorkload, getSLAReport, getTemplates, createTemplate, updateTemplate, deleteTemplate, getSLAConfig, updateSLAConfig, getAllUsers, createUserByAdmin, updateUserRole } from '../controllers/admin.controller';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize(Role.ADMIN, Role.SUPER_ADMIN));

adminRoutes.get('/dashboard', getDashboardStats);
adminRoutes.get('/trends', getTicketTrends);
adminRoutes.get('/engineer-workload', getEngineerWorkload);
adminRoutes.get('/sla-report', getSLAReport);

adminRoutes.get('/templates', getTemplates);
adminRoutes.post('/templates', [body('title').notEmpty(), body('content').notEmpty()], validate, createTemplate);
adminRoutes.put('/templates/:id', updateTemplate);
adminRoutes.delete('/templates/:id', deleteTemplate);

adminRoutes.get('/sla-config', getSLAConfig);
adminRoutes.put('/sla-config', updateSLAConfig);

adminRoutes.get('/users', getAllUsers);
adminRoutes.post('/users', [
  body('name').notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(Object.values(Role)),
], validate, createUserByAdmin);
adminRoutes.patch('/users/:id/role', [body('role').isIn(Object.values(Role))], validate, updateUserRole);
