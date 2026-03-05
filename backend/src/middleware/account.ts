import { Request, Response, NextFunction } from 'express';

const accountMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  (req as any).accountIdFromHeader = req.headers['x-account-id'] || 'default';
  next();
};

export default accountMiddleware;
