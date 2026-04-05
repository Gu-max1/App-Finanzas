import { generateAlerts, generateRecommendations } from '../../src/utils/analyticsEngine';

const baseInput = {
  netIncome: 756,
  availableBalance: 300,
  categorySpends: [
    { category: 'ALIMENTACION', amount: 150, percentage: 0.33 },
    { category: 'ENTRETENIMIENTO', amount: 100, percentage: 0.22 },
    { category: 'TRANSPORTE', amount: 60, percentage: 0.13 },
    { category: 'SERVICIOS', amount: 80, percentage: 0.18 },
    { category: 'OTROS', amount: 66, percentage: 0.14 },
  ],
  consecutiveNegativeQuincenas: 0,
  debtToIncomeRatio: 0.15,
};

describe('generateAlerts', () => {
  it('generates low balance alert when balance < 20% of net income', () => {
    const alerts = generateAlerts({ ...baseInput, availableBalance: 100 }); // 100/756 = 13%
    expect(alerts.some((a) => a.id === 'low-balance')).toBe(true);
  });

  it('does not generate low balance alert when balance is sufficient', () => {
    const alerts = generateAlerts({ ...baseInput, availableBalance: 400 });
    expect(alerts.some((a) => a.id === 'low-balance')).toBe(false);
  });

  it('generates overspend alert for entertainment > 30%', () => {
    const modified = {
      ...baseInput,
      categorySpends: [
        { category: 'ENTRETENIMIENTO', amount: 300, percentage: 0.40 },
      ],
    };
    const alerts = generateAlerts(modified);
    expect(alerts.some((a) => a.id === 'overspend-entretenimiento')).toBe(true);
  });

  it('generates consecutive negative alert for 2+ periods', () => {
    const alerts = generateAlerts({ ...baseInput, consecutiveNegativeQuincenas: 2 });
    expect(alerts.some((a) => a.id === 'consecutive-negative')).toBe(true);
  });

  it('generates high debt ratio alert', () => {
    const alerts = generateAlerts({ ...baseInput, debtToIncomeRatio: 0.45 });
    expect(alerts.some((a) => a.id === 'high-debt-ratio')).toBe(true);
  });

  it('returns at least one alert', () => {
    const alerts = generateAlerts(baseInput);
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('each alert has required fields', () => {
    const alerts = generateAlerts(baseInput);
    for (const alert of alerts) {
      expect(alert.id).toBeDefined();
      expect(alert.type).toMatch(/warning|danger|info/);
      expect(alert.title).toBeDefined();
      expect(alert.message).toBeDefined();
      expect(alert.actionable).toBeDefined();
    }
  });
});

describe('generateRecommendations', () => {
  it('returns array of recommendation strings', () => {
    const recs = generateRecommendations(baseInput);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    recs.forEach((r) => expect(typeof r).toBe('string'));
  });

  it('includes 50/30/20 recommendation for low savings rate', () => {
    const lowSavings = {
      ...baseInput,
      categorySpends: [
        { category: 'ALIMENTACION', amount: 700, percentage: 0.93 },
      ],
    };
    const recs = generateRecommendations(lowSavings);
    expect(recs.some((r) => r.includes('50/30/20'))).toBe(true);
  });
});
