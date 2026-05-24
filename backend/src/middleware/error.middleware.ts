import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error(err.message, err);
  res.status(500).json({ message: 'Internal server error', ...(process.env.NODE_ENV !== 'production' && { error: err.message }) });
};
