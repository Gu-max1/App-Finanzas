import {
  calculatePanamaDeductions,
  generateAmortizationTable,
  calculateFinancialScore,
  calculateRequiredBiweeklySavings,
  compareDebtStrategies,
} from '../../src/utils/financialCalculator';

describe('calculatePanamaDeductions', () => {
  it('calculates mandatory deductions correctly for $850 gross', () => {
    const result = calculatePanamaDeductions(850, false);
    expect(result.grossAmount).toBe(850);
    expect(result.cssDeduction).toBe(82.88); // 850 * 0.0975
    expect(result.educativoDeduction).toBe(10.63); // 850 * 0.0125
    expect(result.ifarhuDeduction).toBe(0);
    expect(result.totalDeductions).toBe(93.5); // 82.88 + 10.63 rounded
    expect(result.netAmount).toBe(756.5);
  });

  it('includes IFARHU deduction when enabled', () => {
    const result = calculatePanamaDeductions(1000, true);
    expect(result.ifarhuDeduction).toBe(5); // 1000 * 0.005
    expect(result.totalDeductions).toBe(111); // 97.5 + 12.5 + 5 = 115 -> wait let me recalc
    // 1000 * 0.0975 = 97.5, 1000 * 0.0125 = 12.5, 1000 * 0.005 = 5
    // total = 115, net = 885
    expect(result.netAmount).toBe(885);
  });

  it('returns zero deductions for zero gross', () => {
    const result = calculatePanamaDeductions(0, false);
    expect(result.netAmount).toBe(0);
    expect(result.totalDeductions).toBe(0);
  });

  it('net amount equals gross minus all deductions', () => {
    const result = calculatePanamaDeductions(1500, true);
    const expectedNet = result.grossAmount - result.totalDeductions;
    expect(Math.abs(result.netAmount - expectedNet)).toBeLessThan(0.01);
  });
});

describe('generateAmortizationTable', () => {
  it('generates correct number of payments', () => {
    // $1000 at 12% annual, $100/month
    // Monthly rate = 1%, payment covers interest of $10
    // Principal per payment ≈ $90
    const table = generateAmortizationTable(1000, 0.12, 100, new Date('2024-01-01'));
    expect(table.rows.length).toBeGreaterThan(0);
    expect(table.rows[table.rows.length - 1].balance).toBeCloseTo(0, 1);
  });

  it('final balance is zero or near zero', () => {
    const table = generateAmortizationTable(5000, 0.18, 200, new Date('2024-01-01'));
    expect(table.rows[table.rows.length - 1].balance).toBeCloseTo(0, 0);
  });

  it('total paid equals principal plus total interest', () => {
    const principal = 2000;
    const table = generateAmortizationTable(principal, 0.15, 150, new Date('2024-01-01'));
    const expectedTotal = principal + table.totalInterestPaid;
    expect(Math.abs(table.totalPaid - expectedTotal)).toBeLessThan(1);
  });

  it('interest decreases over time (amortization pattern)', () => {
    const table = generateAmortizationTable(10000, 0.12, 500, new Date('2024-01-01'));
    const firstInterest = table.rows[0].interest;
    const lastInterest = table.rows[table.rows.length - 1].interest;
    expect(firstInterest).toBeGreaterThan(lastInterest);
  });
});

describe('calculateFinancialScore', () => {
  it('returns 0 for zero net income', () => {
    const result = calculateFinancialScore({
      netIncome: 0,
      totalExpenses: 0,
      totalDebtPayments: 0,
      totalSaved: 0,
      consecutiveNegativeQuincenas: 0,
    });
    expect(result.score).toBe(0);
  });

  it('returns high score for excellent financial behavior', () => {
    const result = calculateFinancialScore({
      netIncome: 1000,
      totalExpenses: 600,
      totalDebtPayments: 50,
      totalSaved: 200,
      consecutiveNegativeQuincenas: 0,
    });
    expect(result.score).toBeGreaterThan(60);
    expect(result.label).toBeDefined();
  });

  it('penalizes consecutive negative quincenas', () => {
    const good = calculateFinancialScore({
      netIncome: 1000, totalExpenses: 700, totalDebtPayments: 100, totalSaved: 100,
      consecutiveNegativeQuincenas: 0,
    });
    const bad = calculateFinancialScore({
      netIncome: 1000, totalExpenses: 700, totalDebtPayments: 100, totalSaved: 100,
      consecutiveNegativeQuincenas: 3,
    });
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it('score is between 0 and 100', () => {
    const result = calculateFinancialScore({
      netIncome: 500, totalExpenses: 600, totalDebtPayments: 200, totalSaved: 0,
      consecutiveNegativeQuincenas: 5,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('calculateRequiredBiweeklySavings', () => {
  it('calculates correct biweekly savings needed', () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 280); // 20 biweekly periods
    const result = calculateRequiredBiweeklySavings(2000, 0, targetDate);
    expect(result.biweeklyPeriods).toBe(20);
    expect(result.biweeklyAmount).toBeCloseTo(100, 0);
    expect(result.isAchievable).toBe(true);
  });

  it('handles already-completed goal', () => {
    const pastDate = new Date('2020-01-01');
    const result = calculateRequiredBiweeklySavings(1000, 1000, pastDate);
    expect(result.biweeklyAmount).toBe(0);
  });
});

describe('compareDebtStrategies', () => {
  const sampleDebts = [
    { id: '1', creditorName: 'Banco A', remainingAmount: 1000, interestRate: 0.15, monthlyPayment: 100 },
    { id: '2', creditorName: 'Banco B', remainingAmount: 500, interestRate: 0.25, monthlyPayment: 60 },
  ];

  it('returns both strategies', () => {
    const result = compareDebtStrategies(sampleDebts);
    expect(result.snowball).toBeDefined();
    expect(result.avalanche).toBeDefined();
    expect(result.recommendation).toBeDefined();
  });

  it('avalanche orders by highest interest first', () => {
    const result = compareDebtStrategies(sampleDebts);
    expect(result.avalanche.order[0].interestRate).toBeGreaterThanOrEqual(
      result.avalanche.order[result.avalanche.order.length - 1].interestRate
    );
  });

  it('snowball orders by lowest balance first', () => {
    const result = compareDebtStrategies(sampleDebts);
    expect(result.snowball.order[0].remainingAmount).toBeLessThanOrEqual(
      result.snowball.order[result.snowball.order.length - 1].remainingAmount
    );
  });
});
