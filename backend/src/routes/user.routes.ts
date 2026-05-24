import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { getUsers, getUserById, updateUser, deactivateUser, getEngineers, getDepartments, createDepartment } from '../controllers/user.controller';

export const userRoutes = Router();

userRoutes.use(authenticate);

userRoutes.get('/', authorize(Role.ADMIN, Role.SUPER_ADMIN), getUsers);
userRoutes.get('/engineers', getEngineers);
userRoutes.get('/departments', getDepartments);
userRoutes.post('/departments', authorize(Role.ADMIN, Role.SUPER_ADMIN), [body('name').trim().notEmpty()], validate, createDepartment);
userRoutes.get('/:id', getUserById);
userRoutes.patch('/:id', updateUser);
userRoutes.patch('/:id/deactivate', authorize(Role.ADMIN, Role.SUPER_ADMIN), deactivateUser);
