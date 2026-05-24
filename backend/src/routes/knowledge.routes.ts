import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { getArticles, getArticleById, createArticle, updateArticle, deleteArticle, searchArticles, voteArticle } from '../controllers/knowledge.controller';

export const knowledgeRoutes = Router();

knowledgeRoutes.use(authenticate);

knowledgeRoutes.get('/', [query('category').optional().isString(), query('search').optional().isString()], validate, getArticles);
knowledgeRoutes.get('/search', searchArticles);
knowledgeRoutes.get('/:id', getArticleById);
knowledgeRoutes.post('/', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.ENGINEER), [
  body('title').trim().notEmpty(),
  body('content').trim().notEmpty(),
  body('category').notEmpty(),
], validate, createArticle);
knowledgeRoutes.put('/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.ENGINEER), updateArticle);
knowledgeRoutes.delete('/:id', authorize(Role.ADMIN, Role.SUPER_ADMIN), deleteArticle);
knowledgeRoutes.post('/:id/vote', [body('vote').isIn(['helpful', 'notHelpful'])], validate, voteArticle);
