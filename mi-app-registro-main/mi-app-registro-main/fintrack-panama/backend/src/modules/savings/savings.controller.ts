import { Request, Response, NextFunction } from 'express';
import * as savingsService from './savings.service';
import { createSavingsGoalSchema, updateSavingsGoalSchema, addContributionSchema } from './savings.schema';
import { AuthenticatedRequest } from '@middleware/authenticate';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = createSavingsGoalSchema.parse(req.body);
    const goal = await savingsService.createSavingsGoal(userId, input);
    res.status(201).json({ status: 'success', data: { goal } });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const goals = await savingsService.getSavingsGoals(userId);
    res.json({ status: 'success', data: { goals } });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const goal = await savingsService.getSavingsGoal(userId, req.params.id);
    res.json({ status: 'success', data: { goal } });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = updateSavingsGoalSchema.parse(req.body);
    const goal = await savingsService.updateSavingsGoal(userId, req.params.id, input);
    res.json({ status: 'success', data: { goal } });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    await savingsService.deleteSavingsGoal(userId, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function addContribution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = addContributionSchema.parse(req.body);
    const contribution = await savingsService.addContribution(userId, req.params.id, input);
    res.status(201).json({ status: 'success', data: { contribution } });
  } catch (err) { next(err); }
}
