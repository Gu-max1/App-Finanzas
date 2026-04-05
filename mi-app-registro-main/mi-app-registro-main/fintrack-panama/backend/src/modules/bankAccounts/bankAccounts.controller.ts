import { Request, Response, NextFunction } from 'express';
import * as service from './bankAccounts.service';
import { createBankAccountSchema, updateBankAccountSchema, updateBalanceSchema } from './bankAccounts.schema';
import { AuthenticatedRequest } from '@middleware/authenticate';
import { SUGGESTED_BANKS } from './bankAccounts.schema';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = createBankAccountSchema.parse(req.body);
    const account = await service.createBankAccount(userId, input);
    res.status(201).json({ status: 'success', data: { account } });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const data = await service.getBankAccounts(userId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const account = await service.getBankAccount(userId, req.params.id);
    res.json({ status: 'success', data: { account } });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = updateBankAccountSchema.parse(req.body);
    const account = await service.updateBankAccount(userId, req.params.id, input);
    res.json({ status: 'success', data: { account } });
  } catch (err) { next(err); }
}

export async function patchBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const input = updateBalanceSchema.parse(req.body);
    const account = await service.updateBalance(userId, req.params.id, input);
    res.json({ status: 'success', data: { account } });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    await service.deleteBankAccount(userId, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function suggestedBanks(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ status: 'success', data: { banks: SUGGESTED_BANKS } });
  } catch (err) { next(err); }
}
