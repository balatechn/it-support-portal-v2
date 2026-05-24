import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { getAssets, getAssetById, createAsset, updateAsset, deleteAsset, assignAsset } from '../controllers/asset.controller';

export const assetRoutes = Router();

assetRoutes.use(authenticate);

assetRoutes.get('/', getAssets);
assetRoutes.get('/:id', getAssetById);
assetRoutes.post('/', authorize(Role.ADMIN, Role.SUPER_ADMIN), [
  body('name').trim().notEmpty(),
  body('type').notEmpty(),
], validate, createAsset);
assetRoutes.put('/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN), updateAsset);
assetRoutes.delete('/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN), deleteAsset);
assetRoutes.post('/:id/assign', authorize(Role.ADMIN, Role.SUPER_ADMIN), [body('userId').notEmpty()], validate, assignAsset);
