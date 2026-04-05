import { PANAMA_DEDUCTIONS } from '@config/constants';

// ─── Panama Deductions ────────────────────────────────────────────────────────

export interface DeductionBreakdown {
  grossAmount: number;
  cssDeduction: number;
  educativoDeduction: number;
  ifarhuDeduction: number;
  totalDeductions: number;
  netAmount: number;
}

export function calculatePanamaDeductions(
  grossAmount: number,
  includesIfarhu = false
): DeductionBreakdown {
  const cssDeduction = round(grossAmount * PANAMA_DEDUCTIONS.CSS_RATE);
  const educativoDeduction = round(grossAmount * PANAMA_DEDUCTIONS.EDUCATIVO_RATE);
  const ifarhuDeduction = includesIfarhu ? round(grossAmount * PANAMA_DEDUCTIONS.IFARHU_RATE) : 0;
  const totalDeductions = round(cssDeduction + educativoDeduction + ifarhuDeduction);
  const netAmount = round(grossAmount - totalDeductions);

  return {
    grossAmount: round(grossAmount),
    cssDeduction,
    educativoDeduction,
    ifarhuDeduction,
    totalDeductions,
    netAmount,
  };
}

// ─── Amortization ─────────────────────────────────────────────────────────────

export interface AmortizationRow {
  period: number;
  date: Date;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AmortizationTable {
  rows: AmortizationRow[];
  totalInterestPaid: number;
  payoffDate: Date;
  totalPaid: number;
}

export function generateAmortizationTable(
  remainingBalance: number,
  annualInterestRate: number,
  monthlyPayment: number,
  startDate: Date
): AmortizationTable {
  const monthlyRate = annualInterestRate / 12;
  const rows: AmortizationRow[] = [];
  let balance = remainingBalance;
  let period = 1;
  let totalInterestPaid = 0;
  let totalPaid = 0;
  const currentDate = new Date(startDate);

  // Safety cap: max 600 periods (50 years)
  while (balance > 0.01 && period <= 600) {
    const interest = round(balance * monthlyRate);
    const principal = round(Math.min(monthlyPayment - interest, balance));
    const payment = round(principal + interest);
    balance = round(balance - principal);

    totalInterestPaid = round(totalInterestPaid + interest);
    totalPaid = round(totalPaid + payment);

    rows.push({
      period,
      date: new Date(currentDate),
      payment,
      principal,
      interest,
      balance: Math.max(0, balance),
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
    period++;

    // If payment doesn't cover interest, debt will never be paid
    if (payment <= interest) break;
  }

  return {
    rows,
    totalInterestPaid,
    payoffDate: rows[rows.length - 1]?.date ?? new Date(),
    totalPaid,
  };
}

// ─── Debt Strategies ─────────────────────────────────────────────────────────

export interface DebtSummary {
  id: string;
  creditorName: string;
  remainingAmount: number;
  interestRate: number;
  monthlyPayment: number;
}

export interface DebtStrategy {
  name: 'snowball' | 'avalanche';
  order: DebtSummary[];
  totalInterestPaid: number;
  payoffMonths: number;
  payoffDate: Date;
  savings: number; // interest saved vs the other strategy
}

export function calculateSnowball(debts: DebtSummary[]): DebtStrategy {
  const sorted = [...debts].sort((a, b) => a.remainingAmount - b.remainingAmount);
  return computeDebtStrategy('snowball', sorted);
}

export function calculateAvalanche(debts: DebtSummary[]): DebtStrategy {
  const sorted = [...debts].sort((a, b) => b.interestRate - a.interestRate);
  return computeDebtStrategy('avalanche', sorted);
}

function computeDebtStrategy(
  name: 'snowball' | 'avalanche',
  sortedDebts: DebtSummary[]
): DebtStrategy {
  let totalInterest = 0;
  let maxMonths = 0;

  for (const debt of sortedDebts) {
    const { rows, totalInterestPaid } = generateAmortizationTable(
      debt.remainingAmount,
      debt.interestRate,
      debt.monthlyPayment,
      new Date()
    );
    totalInterest += totalInterestPaid;
    if (rows.length > maxMonths) maxMonths = rows.length;
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + maxMonths);

  return {
    name,
    order: sortedDebts,
    totalInterestPaid: round(totalInterest),
    payoffMonths: maxMonths,
    payoffDate,
    savings: 0, // Calculated by caller comparing both strategies
  };
}

export function compareDebtStrategies(debts: DebtSummary[]): {
  snowball: DebtStrategy;
  avalanche: DebtStrategy;
  recommendation: string;
} {
  const snowball = calculateSnowball(debts);
  const avalanche = calculateAvalanche(debts);
  const savings = round(snowball.totalInterestPaid - avalanche.totalInterestPaid);

  snowball.savings = 0;
  avalanche.savings = savings;

  const recommendation =
    savings > 0
      ? `La estrategia Avalancha te ahorrará $${savings.toFixed(2)} en intereses. Sin embargo, la Bola de Nieve puede ser más motivadora al eliminar deudas pequeñas primero.`
      : `Ambas estrategias tienen un costo similar. La Bola de Nieve es recomendada por su efecto motivacional.`;

  return { snowball, avalanche, recommendation };
}

// ─── Savings Calculator ───────────────────────────────────────────────────────

export function calculateRequiredBiweeklySavings(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date
): { biweeklyAmount: number; biweeklyPeriods: number; isAchievable: boolean } {
  const remaining = Math.max(0, targetAmount - currentAmount);
  const today = new Date();
  const msToTarget = targetDate.getTime() - today.getTime();
  const daysToTarget = Math.max(0, msToTarget / (1000 * 60 * 60 * 24));
  const biweeklyPeriods = Math.floor(daysToTarget / 14);

  if (biweeklyPeriods <= 0) {
    return { biweeklyAmount: remaining, biweeklyPeriods: 0, isAchievable: false };
  }

  const biweeklyAmount = round(remaining / biweeklyPeriods);
  return { biweeklyAmount, biweeklyPeriods, isAchievable: true };
}

// ─── Financial Score ─────────────────────────────────────────────────────────

export interface ScoreInput {
  netIncome: number;
  totalExpenses: number;
  totalDebtPayments: number;
  totalSaved: number;
  consecutiveNegativeQuincenas: number;
}

export function calculateFinancialScore(input: ScoreInput): {
  score: number;
  label: string;
  breakdown: Record<string, number>;
} {
  const { netIncome, totalExpenses, totalDebtPayments, totalSaved, consecutiveNegativeQuincenas } =
    input;

  if (netIncome <= 0) return { score: 0, label: 'Sin datos', breakdown: {} };

  // Savings rate (30 pts max)
  const savingsRate = totalSaved / netIncome;
  const savingsScore = Math.min(30, Math.round(savingsRate * 150));

  // Debt ratio (25 pts max)
  const debtRatio = totalDebtPayments / netIncome;
  const debtScore = Math.max(0, Math.round(25 - debtRatio * 62.5));

  // Spending control (25 pts max)
  const spendingRatio = totalExpenses / netIncome;
  const spendingScore = spendingRatio <= 0.7 ? 25 : Math.max(0, Math.round(25 - (spendingRatio - 0.7) * 100));

  // Consistency (20 pts max) — penalty for negative quincenas
  const consistencyScore = Math.max(0, 20 - consecutiveNegativeQuincenas * 7);

  const score = Math.min(100, savingsScore + debtScore + spendingScore + consistencyScore);

  let label: string;
  if (score >= 80) label = 'Excelente';
  else if (score >= 60) label = 'Bueno';
  else if (score >= 40) label = 'Regular';
  else label = 'Necesita mejorar';

  return {
    score,
    label,
    breakdown: {
      savings: savingsScore,
      debt: debtScore,
      spending: spendingScore,
      consistency: consistencyScore,
    },
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
