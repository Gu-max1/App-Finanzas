import { PrismaClient, ExpenseCategory } from '@prisma/client';
import { AppError } from '@middleware/errorHandler';
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseFilters } from './expenses.schema';

const prisma = new PrismaClient();

export async function createExpense(userId: string, input: CreateExpenseInput) {
  // Verify income record belongs to user if provided
  if (input.incomeRecordId) {
    const incomeRecord = await prisma.incomeRecord.findFirst({
      where: { id: input.incomeRecordId, userId },
    });
    if (!incomeRecord) throw new AppError('Income record not found', 404);
  }

  return prisma.expense.create({
    data: {
      userId,
      category: input.category,
      amount: input.amount,
      description: input.description,
      date: new Date(input.date),
      type: input.type,
      incomeRecordId: input.incomeRecordId,
      notes: input.notes,
    },
  });
}

export async function getExpenses(userId: string, filters: ExpenseFilters) {
  return prisma.expense.findMany({
    where: {
      userId,
      ...(filters.category && { category: filters.category as ExpenseCategory }),
      ...(filters.type && { type: filters.type }),
      ...(filters.incomeRecordId && { incomeRecordId: filters.incomeRecordId }),
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from && { gte: new Date(filters.from) }),
              ...(filters.to && { lte: new Date(filters.to) }),
            },
          }
        : {}),
    },
    orderBy: { date: 'desc' },
    take: filters.limit ?? 50,
  });
}

export async function getExpense(userId: string, id: string) {
  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) throw new AppError('Expense not found', 404);
  return expense;
}

export async function updateExpense(userId: string, id: string, input: UpdateExpenseInput) {
  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Expense not found', 404);

  return prisma.expense.update({
    where: { id },
    data: {
      ...(input.category && { category: input.category }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.description && { description: input.description }),
      ...(input.date && { date: new Date(input.date) }),
      ...(input.type && { type: input.type }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Expense not found', 404);
  await prisma.expense.delete({ where: { id } });
}

export async function getCategorySummary(userId: string, incomeRecordId?: string) {
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      ...(incomeRecordId && { incomeRecordId }),
    },
    select: { category: true, amount: true },
  });

  const summary = new Map<string, number>();
  let total = 0;

  for (const exp of expenses) {
    const current = summary.get(exp.category) ?? 0;
    const amount = Number(exp.amount);
    summary.set(exp.category, current + amount);
    total += amount;
  }

  return Array.from(summary.entries()).map(([category, amount]) => ({
    category,
    amount: Math.round(amount * 100) / 100,
    percentage: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0,
  }));
}
