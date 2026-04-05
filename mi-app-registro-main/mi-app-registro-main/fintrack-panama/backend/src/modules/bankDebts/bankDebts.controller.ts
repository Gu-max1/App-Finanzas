import { Request, Response, NextFunction } from 'express';
import * as service from './bankDebts.service';
import {
  createBankDebtSchema,
  updateBankDebtSchema,
  addBankDebtPaymentSchema,
  extraPaymentSimulationSchema,
} from './bankDebts.schema';
import { AuthenticatedRequest } from '@middleware/authenticate';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = createBankDebtSchema.parse(req.body);
    const debt = await service.createBankDebt(userId, input);
    res.status(201).json({ status: 'success', data: { debt } });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const data = await service.getBankDebts(userId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const debt = await service.getBankDebt(userId, req.params.id);
    res.json({ status: 'success', data: { debt } });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = updateBankDebtSchema.parse(req.body);
    const debt = await service.updateBankDebt(userId, req.params.id, input);
    res.json({ status: 'success', data: { debt } });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    await service.deleteBankDebt(userId, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function addPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = addBankDebtPaymentSchema.parse(req.body);
    const payment = await service.addPayment(userId, req.params.id, input);
    res.status(201).json({ status: 'success', data: { payment } });
  } catch (err) { next(err); }
}

export async function amortization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const table = await service.getAmortizationTable(userId, req.params.id);
    res.json({ status: 'success', data: { amortization: table } });
  } catch (err) { next(err); }
}

export async function simulateExtra(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = extraPaymentSimulationSchema.parse(req.body);
    const result = await service.simulateExtraPayment(userId, req.params.id, input);
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export async function creditCardAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const result = await service.getCreditCardAnalysis(userId, req.params.id);
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export async function strategies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const result = await service.getBankDebtStrategies(userId);
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export async function debtFreeProjection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const result = await service.getDebtFreeProjection(userId);
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
}
