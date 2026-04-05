import { PrismaClient } from '@prisma/client';
import { AppError } from '@middleware/errorHandler';
import { calculatePanamaDeductions } from '@utils/financialCalculator';
import type { CreateIncomeInput, UpdateIncomeInput } from './income.schema';

const prisma = new PrismaClient();

export async function createIncomeRecord(userId: string, input: CreateIncomeInput) {
  const deductions = calculatePanamaDeductions(input.grossAmount, input.includesIfarhu);

  return prisma.incomeRecord.create({
    data: {
      userId,
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
      grossAmount: deductions.grossAmount,
      cssDeduction: deductions.cssDeduction,
      educativoDeduction: deductions.educativoDeduction,
      ifarhuDeduction: deductions.ifarhuDeduction,
      otherDeductions: input.otherDeductions ?? 0,
      netAmount: deductions.netAmount - (input.otherDeductions ?? 0),
      includesIfarhu: input.includesIfarhu,
      notes: input.notes,
    },
  });
}

export async function getIncomeRecords(userId: string, limit = 12) {
  return prisma.incomeRecord.findMany({
    where: { userId },
    orderBy: { periodStart: 'desc' },
    take: limit,
    include: {
      _count: { select: { expenses: true } },
    },
  });
}

export async function getIncomeRecord(userId: string, id: string) {
  const record = await prisma.incomeRecord.findFirst({
    where: { id, userId },
    include: {
      expenses: { orderBy: { date: 'desc' } },
    },
  });
  if (!record) throw new AppError('Income record not found', 404);
  return record;
}

export async function updateIncomeRecord(userId: string, id: string, input: UpdateIncomeInput) {
  const existing = await prisma.incomeRecord.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Income record not found', 404);

  const grossAmount = input.grossAmount ?? Number(existing.grossAmount);
  const includesIfarhu = input.includesIfarhu ?? existing.includesIfarhu;
  const deductions = calculatePanamaDeductions(grossAmount, includesIfarhu);
  const otherDeductions = input.otherDeductions ?? Number(existing.otherDeductions);

  return prisma.incomeRecord.update({
    where: { id },
    data: {
      ...(input.periodStart && { periodStart: new Date(input.periodStart) }),
      ...(input.periodEnd && { periodEnd: new Date(input.periodEnd) }),
      grossAmount: deductions.grossAmount,
      cssDeduction: deductions.cssDeduction,
      educativoDeduction: deductions.educativoDeduction,
      ifarhuDeduction: deductions.ifarhuDeduction,
      otherDeductions,
      netAmount: deductions.netAmount - otherDeductions,
      includesIfarhu,
      notes: input.notes,
    },
  });
}

export async function deleteIncomeRecord(userId: string, id: string): Promise<void> {
  const existing = await prisma.incomeRecord.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Income record not found', 404);
  await prisma.incomeRecord.delete({ where: { id } });
}

export async function getLatestIncomeRecord(userId: string) {
  return prisma.incomeRecord.findFirst({
    where: { userId },
    orderBy: { periodStart: 'desc' },
  });
}
