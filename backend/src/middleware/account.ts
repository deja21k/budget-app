import { Request, Response, NextFunction } from 'express';

const accountMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  (req as any).accountId = req.headers['x-account-id'] || 'default';
  next();
};

export default accountMiddleware;
