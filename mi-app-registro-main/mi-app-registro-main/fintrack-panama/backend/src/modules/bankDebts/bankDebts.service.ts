import { PrismaClient } from '@prisma/client';
import { AppError } from '@middleware/errorHandler';
import { generateAmortizationTable, compareDebtStrategies, DebtSummary } from '@utils/financialCalculator';
import type {
  CreateBankDebtInput,
  UpdateBankDebtInput,
  AddBankDebtPaymentInput,
  ExtraPaymentSimulationInput,
} from './bankDebts.schema';

const prisma = new PrismaClient();

function round(n: number) { return Math.round(n * 100) / 100; }

export async function createBankDebt(userId: string, input: CreateBankDebtInput) {
  // Verify bank account belongs to user if provided
  if (input.bankAccountId) {
    const account = await prisma.bankAccount.findFirst({ where: { id: input.bankAccountId, userId } });
    if (!account) throw new AppError('Bank account not found', 404);
  }

  return prisma.bankDebt.create({
    data: {
      userId,
      bankAccountId: input.bankAccountId ?? null,
      debtType: input.debtType,
      creditorBank: input.creditorBank,
      originalAmount: input.originalAmount,
      remainingBalance: input.remainingBalance,
      annualRate: input.annualRate,
      monthlyPayment: input.monthlyPayment,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      paymentDay: input.paymentDay,
      notes: input.notes,
      // Credit card specific
      creditLimit: input.creditLimit ?? null,
      currentBalance: input.currentBalance ?? null,
      minimumPayment: input.minimumPayment ?? null,
      cutoffDay: input.cutoffDay ?? null,
      paymentDueDay: input.paymentDueDay ?? null,
    },
    include: { bankAccount: { select: { bankName: true, alias: true } } },
  });
}

export async function getBankDebts(userId: string) {
  const debts = await prisma.bankDebt.findMany({
    where: { userId, isPaid: false },
    orderBy: [{ annualRate: 'desc' }, { remainingBalance: 'desc' }],
    include: {
      bankAccount: { select: { bankName: true, alias: true } },
      payments: { orderBy: { paymentDate: 'desc' }, take: 3 },
    },
  });

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.remainingBalance), 0);
  const totalMonthlyPayments = debts.reduce((sum, d) => sum + Number(d.monthlyPayment), 0);

  return { debts, totalDebt: round(totalDebt), totalMonthlyPayments: round(totalMonthlyPayments) };
}

export async function getBankDebt(userId: string, id: string) {
  const debt = await prisma.bankDebt.findFirst({
    where: { id, userId },
    include: {
      bankAccount: true,
      payments: { orderBy: { paymentDate: 'asc' } },
    },
  });
  if (!debt) throw new AppError('Bank debt not found', 404);
  return debt;
}

export async function updateBankDebt(userId: string, id: string, input: UpdateBankDebtInput) {
  const existing = await prisma.bankDebt.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Bank debt not found', 404);

  return prisma.bankDebt.update({
    where: { id },
    data: {
      ...(input.creditorBank && { creditorBank: input.creditorBank }),
      ...(input.debtType && { debtType: input.debtType }),
      ...(input.originalAmount !== undefined && { originalAmount: input.originalAmount }),
      ...(input.remainingBalance !== undefined && { remainingBalance: input.remainingBalance }),
      ...(input.annualRate !== undefined && { annualRate: input.annualRate }),
      ...(input.monthlyPayment !== undefined && { monthlyPayment: input.monthlyPayment }),
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate) : null }),
      ...(input.paymentDay !== undefined && { paymentDay: input.paymentDay }),
      ...(input.isPaid !== undefined && { isPaid: input.isPaid }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.creditLimit !== undefined && { creditLimit: input.creditLimit }),
      ...(input.currentBalance !== undefined && { currentBalance: input.currentBalance }),
      ...(input.minimumPayment !== undefined && { minimumPayment: input.minimumPayment }),
      ...(input.cutoffDay !== undefined && { cutoffDay: input.cutoffDay }),
      ...(input.paymentDueDay !== undefined && { paymentDueDay: input.paymentDueDay }),
    },
  });
}

export async function deleteBankDebt(userId: string, id: string): Promise<void> {
  const existing = await prisma.bankDebt.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Bank debt not found', 404);
  await prisma.bankDebt.delete({ where: { id } });
}

export async function addPayment(userId: string, debtId: string, input: AddBankDebtPaymentInput) {
  const debt = await prisma.bankDebt.findFirst({ where: { id: debtId, userId } });
  if (!debt) throw new AppError('Bank debt not found', 404);

  const monthlyRate = Number(debt.annualRate) / 12;
  const remaining = Number(debt.remainingBalance);
  const interestPaid = round(remaining * monthlyRate);
  const principalPaid = round(Math.max(0, input.amount - interestPaid));
  const newRemaining = round(Math.max(0, remaining - principalPaid));

  const [payment] = await prisma.$transaction([
    prisma.bankDebtPayment.create({
      data: {
        bankDebtId: debtId,
        amount: input.amount,
        principalPaid,
        interestPaid,
        paymentDate: new Date(input.paymentDate),
      },
    }),
    prisma.bankDebt.update({
      where: { id: debtId },
      data: { remainingBalance: newRemaining, isPaid: newRemaining <= 0 },
    }),
  ]);

  return payment;
}

export async function getAmortizationTable(userId: string, debtId: string) {
  const debt = await prisma.bankDebt.findFirst({ where: { id: debtId, userId } });
  if (!debt) throw new AppError('Bank debt not found', 404);

  return generateAmortizationTable(
    Number(debt.remainingBalance),
    Number(debt.annualRate),
    Number(debt.monthlyPayment),
    new Date()
  );
}

// ─── Simulate extra monthly payment ─────────────────────────────────────────
export async function simulateExtraPayment(
  userId: string,
  debtId: string,
  input: ExtraPaymentSimulationInput
) {
  const debt = await prisma.bankDebt.findFirst({ where: { id: debtId, userId } });
  if (!debt) throw new AppError('Bank debt not found', 404);

  const baseTable = generateAmortizationTable(
    Number(debt.remainingBalance),
    Number(debt.annualRate),
    Number(debt.monthlyPayment),
    new Date()
  );

  const extraTable = generateAmortizationTable(
    Number(debt.remainingBalance),
    Number(debt.annualRate),
    Number(debt.monthlyPayment) + input.extraMonthlyAmount,
    new Date()
  );

  const monthsSaved = baseTable.rows.length - extraTable.rows.length;
  const interestSaved = round(baseTable.totalInterestPaid - extraTable.totalInterestPaid);

  return {
    base: {
      months: baseTable.rows.length,
      totalInterest: baseTable.totalInterestPaid,
      payoffDate: baseTable.payoffDate,
    },
    withExtra: {
      months: extraTable.rows.length,
      totalInterest: extraTable.totalInterestPaid,
      payoffDate: extraTable.payoffDate,
      extraMonthlyAmount: input.extraMonthlyAmount,
    },
    savings: {
      monthsSaved,
      interestSaved,
      message: `Pagando $${input.extraMonthlyAmount.toFixed(2)} extra al mes, liquidas la deuda ${monthsSaved} mes(es) antes y ahorras $${interestSaved.toFixed(2)} en intereses.`,
    },
  };
}

// ─── Credit card specific analysis ───────────────────────────────────────────
export async function getCreditCardAnalysis(userId: string, debtId: string) {
  const debt = await prisma.bankDebt.findFirst({ where: { id: debtId, userId } });
  if (!debt) throw new AppError('Bank debt not found', 404);
  if (debt.debtType !== 'TARJETA_CREDITO') throw new AppError('Debt is not a credit card', 400);

  const limit = Number(debt.creditLimit ?? 0);
  const balance = Number(debt.currentBalance ?? debt.remainingBalance);
  const minPayment = Number(debt.minimumPayment ?? debt.monthlyPayment);
  const monthlyRate = Number(debt.annualRate) / 12;

  const utilizationPercent = limit > 0 ? round((balance / limit) * 100) : 0;
  const utilizationAlert = utilizationPercent > 30;

  // Cost of paying only the minimum
  const minPayTable = generateAmortizationTable(balance, Number(debt.annualRate), minPayment, new Date());

  // Next cutoff and payment due dates
  const today = new Date();
  const cutoffDay = debt.cutoffDay ?? 25;
  const paymentDueDay = debt.paymentDueDay ?? 5;

  const nextCutoff = new Date(today.getFullYear(), today.getMonth(), cutoffDay);
  if (nextCutoff <= today) nextCutoff.setMonth(nextCutoff.getMonth() + 1);

  const nextPaymentDue = new Date(nextCutoff.getFullYear(), nextCutoff.getMonth(), paymentDueDay);
  if (nextPaymentDue <= nextCutoff) nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);

  return {
    creditLimit: limit,
    currentBalance: balance,
    availableCredit: round(limit - balance),
    utilizationPercent,
    utilizationAlert,
    utilizationRecommendation: utilizationAlert
      ? `Tu uso de tarjeta es del ${utilizationPercent}%. Se recomienda mantenerlo por debajo del 30% para mejor salud crediticia.`
      : `Tu uso de tarjeta (${utilizationPercent}%) está dentro del rango saludable.`,
    minimumPaymentAnalysis: {
      monthsToPayOff: minPayTable.rows.length,
      totalInterestIfMinOnly: minPayTable.totalInterestPaid,
      totalPaidIfMinOnly: minPayTable.totalPaid,
      warning: `Si solo pagas el mínimo ($${minPayment.toFixed(2)}/mes), tardarás ${minPayTable.rows.length} meses y pagarás $${minPayTable.totalInterestPaid.toFixed(2)} en intereses adicionales.`,
    },
    nextCutoff: nextCutoff.toISOString(),
    nextPaymentDue: nextPaymentDue.toISOString(),
  };
}

// ─── All bank debts strategies ────────────────────────────────────────────────
export async function getBankDebtStrategies(userId: string) {
  const debts = await prisma.bankDebt.findMany({
    where: { userId, isPaid: false },
    select: {
      id: true,
      creditorBank: true,
      remainingBalance: true,
      annualRate: true,
      monthlyPayment: true,
      debtType: true,
    },
  });

  if (debts.length === 0) return { message: 'No active bank debts', snowball: null, avalanche: null, recommendation: '' };

  const debtSummaries: DebtSummary[] = debts.map((d) => ({
    id: d.id,
    creditorName: `${d.creditorBank} (${DEBT_TYPE_LABELS[d.debtType]})`,
    remainingAmount: Number(d.remainingBalance),
    interestRate: Number(d.annualRate),
    monthlyPayment: Number(d.monthlyPayment),
  }));

  return compareDebtStrategies(debtSummaries);
}

// ─── Debt-free projection date ────────────────────────────────────────────────
export async function getDebtFreeProjection(userId: string) {
  const debts = await prisma.bankDebt.findMany({
    where: { userId, isPaid: false },
    select: { remainingBalance: true, annualRate: true, monthlyPayment: true },
  });

  if (debts.length === 0) {
    return { isDebtFree: true, message: '¡Ya estás libre de deudas bancarias!' };
  }

  let maxMonths = 0;
  let totalInterestRemaining = 0;

  for (const d of debts) {
    const table = generateAmortizationTable(
      Number(d.remainingBalance),
      Number(d.annualRate),
      Number(d.monthlyPayment),
      new Date()
    );
    if (table.rows.length > maxMonths) maxMonths = table.rows.length;
    totalInterestRemaining += table.totalInterestPaid;
  }

  const debtFreeDate = new Date();
  debtFreeDate.setMonth(debtFreeDate.getMonth() + maxMonths);

  return {
    isDebtFree: false,
    estimatedMonths: maxMonths,
    debtFreeDate: debtFreeDate.toISOString(),
    totalInterestRemaining: round(totalInterestRemaining),
    message: `Si mantienes tus pagos actuales, estarás libre de deudas bancarias en ${maxMonths} meses (${debtFreeDate.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })}).`,
  };
}

export const DEBT_TYPE_LABELS: Record<string, string> = {
  PRESTAMO_PERSONAL: 'Préstamo Personal',
  HIPOTECA: 'Hipoteca',
  PRESTAMO_AUTO: 'Préstamo de Auto',
  TARJETA_CREDITO: 'Tarjeta de Crédito',
  LINEA_CREDITO: 'Línea de Crédito',
};
