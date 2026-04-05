import { Request, Response, NextFunction } from 'express';
import * as incomeService from './income.service';
import { createIncomeSchema, updateIncomeSchema } from './income.schema';
import { AuthenticatedRequest } from '@middleware/authenticate';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = createIncomeSchema.parse(req.body);
    const record = await incomeService.createIncomeRecord(userId, input);
    res.status(201).json({ status: 'success', data: { record } });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;
    const records = await incomeService.getIncomeRecords(userId, limit);
    res.json({ status: 'success', data: { records } });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const record = await incomeService.getIncomeRecord(userId, req.params.id);
    res.json({ status: 'success', data: { record } });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = updateIncomeSchema.parse(req.body);
    const record = await incomeService.updateIncomeRecord(userId, req.params.id, input);
    res.json({ status: 'success', data: { record } });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    await incomeService.deleteIncomeRecord(userId, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}
