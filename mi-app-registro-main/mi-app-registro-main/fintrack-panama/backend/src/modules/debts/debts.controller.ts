import { Request, Response, NextFunction } from 'express';
import * as debtService from './debts.service';
import { createDebtSchema, updateDebtSchema, addPaymentSchema } from './debts.schema';
import { AuthenticatedRequest } from '@middleware/authenticate';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = createDebtSchema.parse(req.body);
    const debt = await debtService.createDebt(userId, input);
    res.status(201).json({ status: 'success', data: { debt } });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const debts = await debtService.getDebts(userId);
    res.json({ status: 'success', data: { debts } });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const debt = await debtService.getDebt(userId, req.params.id);
    res.json({ status: 'success', data: { debt } });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = updateDebtSchema.parse(req.body);
    const debt = await debtService.updateDebt(userId, req.params.id, input);
    res.json({ status: 'success', data: { debt } });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    await debtService.deleteDebt(userId, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function addPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = addPaymentSchema.parse(req.body);
    const payment = await debtService.addPayment(userId, req.params.id, input);
    res.status(201).json({ status: 'success', data: { payment } });
  } catch (err) { next(err); }
}

export async function amortization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const table = await debtService.getAmortizationTable(userId, req.params.id);
    res.json({ status: 'success', data: { amortization: table } });
  } catch (err) { next(err); }
}

export async function strategies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const result = await debtService.getDebtStrategies(userId);
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
}
