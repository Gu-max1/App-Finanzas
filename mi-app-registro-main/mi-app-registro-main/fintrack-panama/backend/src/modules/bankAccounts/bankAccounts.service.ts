import { PrismaClient } from '@prisma/client';
import { AppError } from '@middleware/errorHandler';
import type { CreateBankAccountInput, UpdateBankAccountInput, UpdateBalanceInput } from './bankAccounts.schema';

const prisma = new PrismaClient();

export async function createBankAccount(userId: string, input: CreateBankAccountInput) {
  // Only one primary account at a time
  if (input.isPrimary) {
    await prisma.bankAccount.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  return prisma.bankAccount.create({
    data: {
      userId,
      bankName: input.bankName,
      accountType: input.accountType,
      balance: input.balance,
      currency: input.currency,
      alias: input.alias,
      isPrimary: input.isPrimary,
    },
  });
}

export async function getBankAccounts(userId: string) {
  const accounts = await prisma.bankAccount.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { bankName: 'asc' }],
  });

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return {
    accounts,
    totalBalance: Math.round(totalBalance * 100) / 100,
    distribution: accounts.map((a) => ({
      id: a.id,
      label: a.alias ?? a.bankName,
      bankName: a.bankName,
      accountType: a.accountType,
      balance: Number(a.balance),
      percentage: totalBalance > 0 ? Math.round((Number(a.balance) / totalBalance) * 10000) / 100 : 0,
    })),
  };
}

export async function getBankAccount(userId: string, id: string) {
  const account = await prisma.bankAccount.findFirst({
    where: { id, userId },
    include: {
      bankDebts: {
        where: { isPaid: false },
        select: { id: true, debtType: true, remainingBalance: true, monthlyPayment: true },
      },
    },
  });
  if (!account) throw new AppError('Bank account not found', 404);
  return account;
}

export async function updateBankAccount(userId: string, id: string, input: UpdateBankAccountInput) {
  const existing = await prisma.bankAccount.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Bank account not found', 404);

  if (input.isPrimary) {
    await prisma.bankAccount.updateMany({
      where: { userId, isPrimary: true, id: { not: id } },
      data: { isPrimary: false },
    });
  }

  return prisma.bankAccount.update({
    where: { id },
    data: {
      ...(input.bankName && { bankName: input.bankName }),
      ...(input.accountType && { accountType: input.accountType }),
      ...(input.balance !== undefined && { balance: input.balance }),
      ...(input.currency && { currency: input.currency }),
      ...(input.alias !== undefined && { alias: input.alias }),
      ...(input.isPrimary !== undefined && { isPrimary: input.isPrimary }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function updateBalance(userId: string, id: string, input: UpdateBalanceInput) {
  const existing = await prisma.bankAccount.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Bank account not found', 404);

  return prisma.bankAccount.update({
    where: { id },
    data: { balance: input.balance },
  });
}

export async function deleteBankAccount(userId: string, id: string): Promise<void> {
  const existing = await prisma.bankAccount.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Bank account not found', 404);
  // Soft delete
  await prisma.bankAccount.update({ where: { id }, data: { isActive: false } });
}

export async function getTotalAssets(userId: string): Promise<number> {
  const result = await prisma.bankAccount.aggregate({
    where: { userId, isActive: true },
    _sum: { balance: true },
  });
  return Number(result._sum.balance ?? 0);
}
