import { PrismaClient } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler'; // Verifica que la ruta relativa sea correcta
import { calculateRequiredBiweeklySavings } from '../../utils/financialCalculator'; // Verifica esta ruta
import type { CreateSavingsGoalInput, UpdateSavingsGoalInput, AddContributionInput } from './savings.schema';

const prisma = new PrismaClient();

export async function createSavingsGoal(userId: string, input: CreateSavingsGoalInput) {
  // Solo una meta principal a la vez
  if (input.isPrimary) {
    await prisma.savingsGoal.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  return prisma.savingsGoal.create({
    data: {
      userId,
      name: input.name,
      targetAmount: input.targetAmount,
      targetDate: new Date(input.targetDate),
      isPrimary: input.isPrimary,
      notes: input.notes,
    },
  });
}

export async function getSavingsGoals(userId: string) {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: [{ isPrimary: 'desc' }, { targetDate: 'asc' }],
    include: {
      contributions: { orderBy: { date: 'desc' }, take: 5 },
    },
  });

  return goals.map((goal) => {
    const target = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);

    const { biweeklyAmount, biweeklyPeriods, isAchievable } = calculateRequiredBiweeklySavings(
      target,
      current,
      goal.targetDate
    );

    // Cálculo de progreso seguro para tipos Decimal
    const progressPercent = target > 0 
      ? Math.min(100, Math.round((current / target) * 100)) 
      : 0;

    return {
      ...goal,
      biweeklyRequired: biweeklyAmount,
      biweeklyPeriods,
      isAchievable,
      progressPercent,
    };
  });
}

export async function getSavingsGoal(userId: string, id: string) {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id, userId },
    include: { contributions: { orderBy: { date: 'desc' } } },
  });
  if (!goal) throw new AppError('Savings goal not found', 404);

  const target = Number(goal.targetAmount);
  const current = Number(goal.currentAmount);

  const { biweeklyAmount, biweeklyPeriods, isAchievable } = calculateRequiredBiweeklySavings(
    target,
    current,
    goal.targetDate
  );

  const progressPercent = target > 0 
    ? Math.min(100, Math.round((current / target) * 100)) 
    : 0;

  return {
    ...goal,
    biweeklyRequired: biweeklyAmount,
    biweeklyPeriods,
    isAchievable,
    progressPercent,
  };
}

export async function updateSavingsGoal(userId: string, id: string, input: UpdateSavingsGoalInput) {
  const existing = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Savings goal not found', 404);

  if (input.isPrimary) {
    await prisma.savingsGoal.updateMany({
      where: { userId, isPrimary: true, id: { not: id } },
      data: { isPrimary: false },
    });
  }

  return prisma.savingsGoal.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.targetAmount !== undefined && { targetAmount: input.targetAmount }),
      ...(input.targetDate && { targetDate: new Date(input.targetDate) }),
      ...(input.isPrimary !== undefined && { isPrimary: input.isPrimary }),
      ...(input.isCompleted !== undefined && { isCompleted: input.isCompleted }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteSavingsGoal(userId: string, id: string): Promise<void> {
  const existing = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Savings goal not found', 404);
  await prisma.savingsGoal.delete({ where: { id } });
}

export async function addContribution(userId: string, goalId: string, input: AddContributionInput) {
  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new AppError('Savings goal not found', 404);

  const currentAmount = Number(goal.currentAmount);
  const targetAmount = Number(goal.targetAmount);
  const newAmount = currentAmount + input.amount;
  const isCompleted = newAmount >= targetAmount;

  const [contribution] = await prisma.$transaction([
    prisma.savingsContribution.create({
      data: {
        savingsGoalId: goalId,
        amount: input.amount,
        date: new Date(input.date),
        notes: input.notes,
      },
    }),
    prisma.savingsGoal.update({
      where: { id: goalId },
      data: {
        currentAmount: Math.min(newAmount, targetAmount),
        isCompleted,
      },
    }),
  ]);

  return contribution;
}
