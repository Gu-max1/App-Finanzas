import { Request, Response, NextFunction } from 'express';
import * as expenseService from './expenses.service';
import { createExpenseSchema, updateExpenseSchema, expenseFiltersSchema } from './expenses.schema';
import { AuthenticatedRequest } from '@middleware/authenticate';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = createExpenseSchema.parse(req.body);
    const expense = await expenseService.createExpense(userId, input);
    res.status(201).json({ status: 'success', data: { expense } });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const filters = expenseFiltersSchema.parse(req.query);
    const expenses = await expenseService.getExpenses(userId, filters);
    res.json({ status: 'success', data: { expenses } });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const expense = await expenseService.getExpense(userId, req.params.id);
    res.json({ status: 'success', data: { expense } });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = updateExpenseSchema.parse(req.body);
    const expense = await expenseService.updateExpense(userId, req.params.id, input);
    res.json({ status: 'success', data: { expense } });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    await expenseService.deleteExpense(userId, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function summary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const incomeRecordId = req.query.incomeRecordId as string | undefined;
    const data = await expenseService.getCategorySummary(userId, incomeRecordId);
    res.json({ status: 'success', data: { summary: data } });
  } catch (err) { next(err); }
}
