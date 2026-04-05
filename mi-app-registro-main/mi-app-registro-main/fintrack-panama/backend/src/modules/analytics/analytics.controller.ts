import { Request, Response, NextFunction } from 'express';
import * as analyticsService from './analytics.service';
import { AuthenticatedRequest } from '@middleware/authenticate';

export async function dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const data = await analyticsService.getDashboardData(userId);
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}
