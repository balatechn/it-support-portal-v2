import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { AssetStatus } from '@prisma/client';

export const getAssets = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, status, assignedToId, search } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { serialNumber: { contains: search, mode: 'insensitive' } }];
  const assets = await prisma.asset.findMany({
    where,
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(assets);
};

export const getAssetById = async (req: AuthRequest, res: Response): Promise<void> => {
  const asset = await prisma.asset.findUnique({
    where: { id: req.params.id },
    include: { assignedTo: { select: { id: true, name: true, email: true } }, tickets: { select: { id: true, ticketId: true, title: true, status: true, createdAt: true }, take: 10, orderBy: { createdAt: 'desc' } } },
  });
  if (!asset) { res.status(404).json({ message: 'Asset not found' }); return; }
  res.json(asset);
};

export const createAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const asset = await prisma.asset.create({ data: req.body });
  res.status(201).json(asset);
};

export const updateAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const asset = await prisma.asset.update({ where: { id: req.params.id }, data: req.body });
  res.json(asset);
};

export const deleteAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.asset.delete({ where: { id: req.params.id } });
  res.json({ message: 'Asset deleted' });
};

export const assignAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.body;
  const asset = await prisma.asset.update({
    where: { id: req.params.id },
    data: { assignedToId: userId, status: AssetStatus.ACTIVE },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });
  res.json(asset);
};
