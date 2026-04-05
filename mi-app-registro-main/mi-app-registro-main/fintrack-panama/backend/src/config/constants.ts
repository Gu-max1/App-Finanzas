// Panama deduction rates (as of 2024)
export const PANAMA_DEDUCTIONS = {
  CSS_RATE: 0.0975,         // Caja de Seguro Social 9.75%
  EDUCATIVO_RATE: 0.0125,   // Seguro Educativo 1.25%
  IFARHU_RATE: 0.005,       // IFARHU 0.5% (optional)
  TOTAL_MANDATORY: 0.11,    // CSS + Educativo
} as const;

// Financial health thresholds
export const FINANCIAL_THRESHOLDS = {
  MIN_BALANCE_PERCENT: 0.20,           // Alert if balance < 20% of net income
  MAX_ENTERTAINMENT_PERCENT: 0.30,     // Alert if entertainment > 30% net
  MAX_FOOD_PERCENT: 0.35,              // Alert if food > 35% net
  MAX_TRANSPORT_PERCENT: 0.20,         // Alert if transport > 20% net
  MAX_DEBT_RATIO: 0.40,                // Alert if debt payments > 40% net income
  IDEAL_SAVINGS_RATE: 0.20,            // Recommended savings 20%
} as const;

// Score weights
export const SCORE_WEIGHTS = {
  SAVINGS_RATE: 30,
  DEBT_RATIO: 25,
  SPENDING_CONTROL: 25,
  CONSISTENCY: 20,
} as const;

// Expense categories
export const EXPENSE_CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Salud',
  'Entretenimiento',
  'Servicios',
  'Educación',
  'Vivienda',
  'Ropa',
  'Tecnología',
  'Otros',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Biweekly cycle: Panama pays on 15th and last day of month
export const BIWEEKLY_DAYS = [15, 31] as const;

export const BCRYPT_SALT_ROUNDS = 12;
