// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Income ───────────────────────────────────────────────────────────────────
export interface IncomeRecord {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: string;
  cssDeduction: string;
  educativoDeduction: string;
  ifarhuDeduction: string;
  otherDeductions: string;
  netAmount: string;
  includesIfarhu: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { expenses: number };
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export type ExpenseCategory =
  | 'ALIMENTACION' | 'TRANSPORTE' | 'SALUD' | 'ENTRETENIMIENTO'
  | 'SERVICIOS' | 'EDUCACION' | 'VIVIENDA' | 'ROPA' | 'TECNOLOGIA' | 'OTROS';

export type ExpenseType = 'FIJO' | 'VARIABLE';

export interface Expense {
  id: string;
  userId: string;
  incomeRecordId: string | null;
  category: ExpenseCategory;
  amount: string;
  description: string;
  date: string;
  type: ExpenseType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
}

// ─── Debts ────────────────────────────────────────────────────────────────────
export interface Debt {
  id: string;
  userId: string;
  creditorName: string;
  totalAmount: string;
  remainingAmount: string;
  interestRate: string;
  monthlyPayment: string;
  startDate: string;
  endDate: string | null;
  isPaid: boolean;
  notes: string | null;
  payments?: DebtPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: string;
  principalPaid: string;
  interestPaid: string;
  paymentDate: string;
  createdAt: string;
}

export interface AmortizationRow {
  period: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// ─── Savings ──────────────────────────────────────────────────────────────────
export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  isCompleted: boolean;
  isPrimary: boolean;
  notes: string | null;
  biweeklyRequired?: number;
  biweeklyPeriods?: number;
  isAchievable?: boolean;
  progressPercent?: number;
  contributions?: SavingsContribution[];
  createdAt: string;
  updatedAt: string;
}

export interface SavingsContribution {
  id: string;
  savingsGoalId: string;
  amount: string;
  date: string;
  notes: string | null;
  createdAt: string;
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────
export type BankAccountType = 'CORRIENTE' | 'AHORROS' | 'INVERSION';

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  accountType: BankAccountType;
  balance: string;
  currency: string;
  alias: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountDistribution {
  id: string;
  label: string;
  bankName: string;
  accountType: BankAccountType;
  balance: number;
  percentage: number;
}

// ─── Bank Debts ───────────────────────────────────────────────────────────────
export type BankDebtType =
  | 'PRESTAMO_PERSONAL' | 'HIPOTECA' | 'PRESTAMO_AUTO'
  | 'TARJETA_CREDITO' | 'LINEA_CREDITO';

export interface BankDebt {
  id: string;
  userId: string;
  bankAccountId: string | null;
  debtType: BankDebtType;
  creditorBank: string;
  originalAmount: string;
  remainingBalance: string;
  annualRate: string;
  monthlyPayment: string;
  startDate: string;
  endDate: string | null;
  paymentDay: number;
  isPaid: boolean;
  creditLimit: string | null;
  currentBalance: string | null;
  minimumPayment: string | null;
  cutoffDay: number | null;
  paymentDueDay: number | null;
  notes: string | null;
  bankAccount?: { bankName: string; alias: string | null } | null;
  payments?: BankDebtPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface BankDebtPayment {
  id: string;
  bankDebtId: string;
  amount: string;
  principalPaid: string;
  interestPaid: string;
  paymentDate: string;
  createdAt: string;
}

// ─── Net Worth Panel ──────────────────────────────────────────────────────────
export interface NetWorthPanel {
  totalBankAssets: number;
  totalBankDebts: number;
  netWorth: number;
  semaphore: 'verde' | 'amarillo' | 'rojo';
  semaphoreMessage: string;
  debtToIncomeMonthly: number;
  debtFreeProjection: {
    estimatedMonths: number;
    debtFreeDate: string;
    message: string;
  } | null;
  bankAccountsCount: number;
  bankDebtsCount: number;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  actionable: string;
}

export interface PeriodChartData {
  label: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface DashboardData {
  summary: {
    availableBalance: number;
    totalExpensesThisPeriod: number;
    totalDebtPending: number;
    netIncome: number;
    primaryGoal: {
      name: string;
      targetAmount: number;
      currentAmount: number;
      progressPercent: number;
    } | null;
  };
  netWorthPanel: NetWorthPanel;
  charts: {
    periodData: PeriodChartData[];
    categoryData: CategorySummary[];
  };
  alerts: Alert[];
  recommendations: string[];
  financialScore: {
    score: number;
    label: string;
    breakdown: Record<string, number>;
  };
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}
