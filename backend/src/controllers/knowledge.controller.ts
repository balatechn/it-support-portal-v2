import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getArticles = async (req: AuthRequest, res: Response): Promise<void> => {
  const { category, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const take = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * take;
  const where: Record<string, unknown> = { isPublished: true };
  if (category) where.category = category;
  if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { content: { contains: search, mode: 'insensitive' } }];
  const [articles, total] = await Promise.all([
    prisma.knowledgeBase.findMany({ where, skip, take, orderBy: { views: 'desc' } }),
    prisma.knowledgeBase.count({ where }),
  ]);
  res.json({ articles, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
};

export const searchArticles = async (req: AuthRequest, res: Response): Promise<void> => {
  const { q } = req.query as { q: string };
  if (!q) { res.json([]); return; }
  const articles = await prisma.knowledgeBase.findMany({
    where: { isPublished: true, OR: [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }, { tags: { has: q.toLowerCase() } }] },
    take: 10,
    orderBy: { views: 'desc' },
  });
  res.json(articles);
};

export const getArticleById = async (req: AuthRequest, res: Response): Promise<void> => {
  const article = await prisma.knowledgeBase.findUnique({ where: { id: req.params.id } });
  if (!article) { res.status(404).json({ message: 'Article not found' }); return; }
  await prisma.knowledgeBase.update({ where: { id: article.id }, data: { views: { increment: 1 } } });
  res.json(article);
};

export const createArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, content, category, tags, isPublished = true } = req.body;
  const article = await prisma.knowledgeBase.create({ data: { title, content, category, tags: tags || [], isPublished, createdById: req.user!.id } });
  res.status(201).json(article);
};

export const updateArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  const article = await prisma.knowledgeBase.update({
    where: { id: req.params.id },
    data: { ...req.body, updatedById: req.user!.id, updatedAt: new Date() },
  });
  res.json(article);
};

export const deleteArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.knowledgeBase.delete({ where: { id: req.params.id } });
  res.json({ message: 'Article deleted' });
};

export const voteArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  const { vote } = req.body;
  const article = await prisma.knowledgeBase.update({
    where: { id: req.params.id },
    data: vote === 'helpful' ? { helpful: { increment: 1 } } : { notHelpful: { increment: 1 } },
  });
  res.json(article);
};
