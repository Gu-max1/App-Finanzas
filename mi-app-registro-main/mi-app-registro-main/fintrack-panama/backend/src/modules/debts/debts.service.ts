import { PrismaClient } from '@prisma/client';
import { AppError } from '@middleware/errorHandler';
import {
  generateAmortizationTable,
  compareDebtStrategies,
  DebtSummary,
} from '@utils/financialCalculator';
import type { CreateDebtInput, UpdateDebtInput, AddPaymentInput } from './debts.schema';

const prisma = new PrismaClient();

export async function createDebt(userId: string, input: CreateDebtInput) {
  return prisma.debt.create({
    data: {
      userId,
      creditorName: input.creditorName,
      totalAmount: input.totalAmount,
      remainingAmount: input.remainingAmount,
      interestRate: input.interestRate,
      monthlyPayment: input.monthlyPayment,
      startDate: new Date(input.startDate),
      notes: input.notes,
    },
  });
}

export async function getDebts(userId: string) {
  return prisma.debt.findMany({
    where: { userId, isPaid: false },
    orderBy: { interestRate: 'desc' },
    include: { payments: { orderBy: { paymentDate: 'desc' }, take: 3 } },
  });
}

export async function getDebt(userId: string, id: string) {
  const debt = await prisma.debt.findFirst({
    where: { id, userId },
    include: { payments: { orderBy: { paymentDate: 'asc' } } },
  });
  if (!debt) throw new AppError('Debt not found', 404);
  return debt;
}

export async function updateDebt(userId: string, id: string, input: UpdateDebtInput) {
  const existing = await prisma.debt.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Debt not found', 404);

  return prisma.debt.update({
    where: { id },
    data: {
      ...(input.creditorName && { creditorName: input.creditorName }),
      ...(input.totalAmount !== undefined && { totalAmount: input.totalAmount }),
      ...(input.remainingAmount !== undefined && { remainingAmount: input.remainingAmount }),
      ...(input.interestRate !== undefined && { interestRate: input.interestRate }),
      ...(input.monthlyPayment !== undefined && { monthlyPayment: input.monthlyPayment }),
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.isPaid !== undefined && { isPaid: input.isPaid }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteDebt(userId: string, id: string): Promise<void> {
  const existing = await prisma.debt.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Debt not found', 404);
  await prisma.debt.delete({ where: { id } });
}

export async function addPayment(userId: string, debtId: string, input: AddPaymentInput) {
  const debt = await prisma.debt.findFirst({ where: { id: debtId, userId } });
  if (!debt) throw new AppError('Debt not found', 404);

  const monthlyRate = Number(debt.interestRate) / 12;
  const remaining = Number(debt.remainingAmount);
  const interestPaid = Math.round(remaining * monthlyRate * 100) / 100;
  const principalPaid = Math.round((input.amount - interestPaid) * 100) / 100;
  const newRemaining = Math.max(0, Math.round((remaining - principalPaid) * 100) / 100);

  const [payment] = await prisma.$transaction([
    prisma.debtPayment.create({
      data: {
        debtId,
        amount: input.amount,
        principalPaid,
        interestPaid,
        paymentDate: new Date(input.paymentDate),
      },
    }),
    prisma.debt.update({
      where: { id: debtId },
      data: {
        remainingAmount: newRemaining,
        isPaid: newRemaining <= 0,
      },
    }),
  ]);

  return payment;
}

export async function getAmortizationTable(userId: string, debtId: string) {
  const debt = await prisma.debt.findFirst({ where: { id: debtId, userId } });
  if (!debt) throw new AppError('Debt not found', 404);

  return generateAmortizationTable(
    Number(debt.remainingAmount),
    Number(debt.interestRate),
    Number(debt.monthlyPayment),
    new Date()
  );
}

export async function getDebtStrategies(userId: string) {
  const debts = await prisma.debt.findMany({
    where: { userId, isPaid: false },
    select: {
      id: true,
      creditorName: true,
      remainingAmount: true,
      interestRate: true,
      monthlyPayment: true,
    },
  });

  if (debts.length === 0) {
    return { message: 'No active debts found', snowball: null, avalanche: null };
  }

  const debtSummaries: DebtSummary[] = debts.map((d) => ({
    id: d.id,
    creditorName: d.creditorName,
    remainingAmount: Number(d.remainingAmount),
    interestRate: Number(d.interestRate),
    monthlyPayment: Number(d.monthlyPayment),
  }));

  return compareDebtStrategies(debtSummaries);
}
