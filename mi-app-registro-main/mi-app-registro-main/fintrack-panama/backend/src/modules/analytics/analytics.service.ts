import { PrismaClient } from '@prisma/client';
import { calculateFinancialScore, generateAmortizationTable } from '@utils/financialCalculator';
import { generateAlerts, generateRecommendations } from '@utils/analyticsEngine';

const prisma = new PrismaClient();

export async function getDashboardData(userId: string) {
  // Get latest income record
  const latestIncome = await prisma.incomeRecord.findFirst({
    where: { userId },
    orderBy: { periodStart: 'desc' },
    include: { expenses: true },
  });

  // Get total expenses this period
  const currentPeriodExpenses = latestIncome?.expenses ?? [];
  const totalExpenses = currentPeriodExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netIncome = latestIncome ? Number(latestIncome.netAmount) : 0;
  const availableBalance = netIncome - totalExpenses;

  // Get 6 periods for chart
  const last6Periods = await prisma.incomeRecord.findMany({
    where: { userId },
    orderBy: { periodStart: 'desc' },
    take: 6,
    include: { expenses: { select: { amount: true } } },
  });

  const periodChartData = last6Periods
    .reverse()
    .map((p) => ({
      label: formatPeriodLabel(p.periodStart),
      income: Number(p.netAmount),
      expenses: p.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      balance: Number(p.netAmount) - p.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    }));

  // Category breakdown
  const categoryData = await prisma.expense.groupBy({
    by: ['category'],
    where: {
      userId,
      ...(latestIncome ? { incomeRecordId: latestIncome.id } : {}),
    },
    _sum: { amount: true },
  });

  const totalCategoryExpenses = categoryData.reduce(
    (sum, c) => sum + Number(c._sum.amount ?? 0),
    0
  );
  const categorySpends = categoryData.map((c) => ({
    category: c.category,
    amount: Number(c._sum.amount ?? 0),
    percentage: totalCategoryExpenses > 0 ? Number(c._sum.amount ?? 0) / totalCategoryExpenses : 0,
  }));

  // Active debts summary
  const activeDebts = await prisma.debt.findMany({
    where: { userId, isPaid: false },
    select: { monthlyPayment: true, remainingAmount: true },
  });
  const totalDebtPending = activeDebts.reduce((sum, d) => sum + Number(d.remainingAmount), 0);
  const monthlyDebtPayments = activeDebts.reduce((sum, d) => sum + Number(d.monthlyPayment), 0);
  const biweeklyDebtPayments = monthlyDebtPayments / 2;
  const debtToIncomeRatio = netIncome > 0 ? biweeklyDebtPayments / netIncome : 0;

  // Primary savings goal
  const primaryGoal = await prisma.savingsGoal.findFirst({
    where: { userId, isPrimary: true, isCompleted: false },
  });

  // Consecutive negative quincenas
  const recentPeriods = await prisma.incomeRecord.findMany({
    where: { userId },
    orderBy: { periodStart: 'desc' },
    take: 4,
    include: { expenses: { select: { amount: true } } },
  });

  let consecutiveNegative = 0;
  for (const period of recentPeriods) {
    const periodExpenses = period.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    if (periodExpenses > Number(period.netAmount)) {
      consecutiveNegative++;
    } else {
      break;
    }
  }

  // Alerts
  const alerts = generateAlerts({
    netIncome,
    availableBalance,
    categorySpends,
    consecutiveNegativeQuincenas: consecutiveNegative,
    debtToIncomeRatio,
  });

  // Recommendations
  const recommendations = generateRecommendations({
    netIncome,
    availableBalance,
    categorySpends,
    consecutiveNegativeQuincenas: consecutiveNegative,
    debtToIncomeRatio,
  });

  // Financial score
  const totalSaved = primaryGoal ? Number(primaryGoal.currentAmount) : 0;
  const { score, label, breakdown } = calculateFinancialScore({
    netIncome,
    totalExpenses,
    totalDebtPayments: biweeklyDebtPayments,
    totalSaved,
    consecutiveNegativeQuincenas: consecutiveNegative,
  });

  // ─── Net Worth & Financial Health ─────────────────────────────────────────
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { userId, isActive: true },
    select: { balance: true, bankName: true, alias: true, accountType: true },
  });
  const bankDebts = await prisma.bankDebt.findMany({
    where: { userId, isPaid: false },
    select: { remainingBalance: true, annualRate: true, monthlyPayment: true, debtType: true },
  });

  const totalBankAssets = bankAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalBankDebtAmount = bankDebts.reduce((sum, d) => sum + Number(d.remainingBalance), 0);
  const netWorth = Math.round((totalBankAssets - totalBankDebtAmount) * 100) / 100;

  const totalMonthlyBankDebtPayments = bankDebts.reduce((sum, d) => sum + Number(d.monthlyPayment), 0);
  const monthlyIncome = netIncome * 2; // biweekly → monthly
  const debtToIncomeMonthly = monthlyIncome > 0 ? totalMonthlyBankDebtPayments / monthlyIncome : 0;

  // Semaphore logic
  let semaphore: 'verde' | 'amarillo' | 'rojo';
  let semaphoreMessage: string;
  if (netWorth >= 0 && debtToIncomeMonthly <= 0.35) {
    semaphore = 'verde';
    semaphoreMessage = 'Tu salud financiera es buena. Patrimonio positivo y deudas controladas.';
  } else if (debtToIncomeMonthly > 0.50 || netWorth < 0) {
    semaphore = 'rojo';
    semaphoreMessage = netWorth < 0
      ? 'Tu patrimonio es negativo. Tus deudas superan tus activos bancarios.'
      : `Tus pagos de deuda representan el ${Math.round(debtToIncomeMonthly * 100)}% de tu ingreso mensual. Nivel crítico.`;
  } else {
    semaphore = 'amarillo';
    semaphoreMessage = `Tus pagos de deuda son el ${Math.round(debtToIncomeMonthly * 100)}% de tu ingreso mensual. En zona de precaución.`;
  }

  // Debt-free projection
  let debtFreeProjection: { estimatedMonths: number; debtFreeDate: string; message: string } | null = null;
  if (bankDebts.length > 0) {
    let maxMonths = 0;
    for (const d of bankDebts) {
      const table = generateAmortizationTable(
        Number(d.remainingBalance), Number(d.annualRate), Number(d.monthlyPayment), new Date()
      );
      if (table.rows.length > maxMonths) maxMonths = table.rows.length;
    }
    const debtFreeDate = new Date();
    debtFreeDate.setMonth(debtFreeDate.getMonth() + maxMonths);
    debtFreeProjection = {
      estimatedMonths: maxMonths,
      debtFreeDate: debtFreeDate.toISOString(),
      message: `Con los pagos actuales, quedarás libre de deudas en ${maxMonths} meses (${debtFreeDate.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })}).`,
    };
  }

  return {
    summary: {
      availableBalance: Math.round(availableBalance * 100) / 100,
      totalExpensesThisPeriod: Math.round(totalExpenses * 100) / 100,
      totalDebtPending: Math.round(totalDebtPending * 100) / 100,
      netIncome,
      primaryGoal: primaryGoal
        ? {
            name: primaryGoal.name,
            targetAmount: Number(primaryGoal.targetAmount),
            currentAmount: Number(primaryGoal.currentAmount),
            progressPercent: Math.min(
              100,
              Math.round((Number(primaryGoal.currentAmount) / Number(primaryGoal.targetAmount)) * 100)
            ),
          }
        : null,
    },
    netWorthPanel: {
      totalBankAssets: Math.round(totalBankAssets * 100) / 100,
      totalBankDebts: Math.round(totalBankDebtAmount * 100) / 100,
      netWorth,
      semaphore,
      semaphoreMessage,
      debtToIncomeMonthly: Math.round(debtToIncomeMonthly * 10000) / 100,
      debtFreeProjection,
      bankAccountsCount: bankAccounts.length,
      bankDebtsCount: bankDebts.length,
    },
    charts: {
      periodData: periodChartData,
      categoryData: categorySpends,
    },
    alerts,
    recommendations,
    financialScore: { score, label, breakdown },
  };
}

function formatPeriodLabel(date: Date): string {
  const d = new Date(date);
  const month = d.toLocaleString('es-PA', { month: 'short' });
  const day = d.getDate();
  return `${month} ${day <= 15 ? '1ª' : '2ª'}`;
}
