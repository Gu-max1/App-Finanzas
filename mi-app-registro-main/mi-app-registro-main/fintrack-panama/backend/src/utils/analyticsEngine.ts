import { FINANCIAL_THRESHOLDS } from '@config/constants';

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  actionable: string;
}

export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
}

export interface AnalyticsInput {
  netIncome: number;
  availableBalance: number;
  categorySpends: CategorySpend[];
  consecutiveNegativeQuincenas: number;
  debtToIncomeRatio: number;
}

// Maps internal category names to display names
const CATEGORY_DISPLAY: Record<string, string> = {
  ALIMENTACION: 'Alimentación',
  TRANSPORTE: 'Transporte',
  SALUD: 'Salud',
  ENTRETENIMIENTO: 'Entretenimiento',
  SERVICIOS: 'Servicios',
  EDUCACION: 'Educación',
  VIVIENDA: 'Vivienda',
  ROPA: 'Ropa',
  TECNOLOGIA: 'Tecnología',
  OTROS: 'Otros',
};

const CATEGORY_LIMITS: Record<string, number> = {
  ENTRETENIMIENTO: FINANCIAL_THRESHOLDS.MAX_ENTERTAINMENT_PERCENT,
  ALIMENTACION: FINANCIAL_THRESHOLDS.MAX_FOOD_PERCENT,
  TRANSPORTE: FINANCIAL_THRESHOLDS.MAX_TRANSPORT_PERCENT,
};

export function generateAlerts(input: AnalyticsInput): Alert[] {
  const alerts: Alert[] = [];
  const { netIncome, availableBalance, categorySpends, consecutiveNegativeQuincenas, debtToIncomeRatio } = input;

  // 1. Low balance alert
  const balancePercent = availableBalance / netIncome;
  if (balancePercent < FINANCIAL_THRESHOLDS.MIN_BALANCE_PERCENT) {
    alerts.push({
      id: 'low-balance',
      type: 'danger',
      title: 'Saldo disponible bajo',
      message: `Tu saldo disponible ($${availableBalance.toFixed(2)}) es menor al 20% de tu ingreso neto. Tienes poco margen para imprevistos.`,
      actionable: 'Revisa tus gastos variables y considera recortar categorías no esenciales esta quincena.',
    });
  }

  // 2. Category overspending alerts
  for (const spend of categorySpends) {
    const limit = CATEGORY_LIMITS[spend.category];
    if (limit && spend.percentage > limit) {
      const displayName = CATEGORY_DISPLAY[spend.category] ?? spend.category;
      const limitPct = Math.round(limit * 100);
      const actualPct = Math.round(spend.percentage * 100);
      alerts.push({
        id: `overspend-${spend.category.toLowerCase()}`,
        type: 'warning',
        title: `Gasto alto en ${displayName}`,
        message: `Estás gastando el ${actualPct}% de tu ingreso neto en ${displayName} (límite recomendado: ${limitPct}%).`,
        actionable: `Intenta reducir tus gastos de ${displayName} a menos de $${(netIncome * limit).toFixed(2)} por quincena.`,
      });
    }
  }

  // 3. Consecutive negative quincenas
  if (consecutiveNegativeQuincenas >= 2) {
    alerts.push({
      id: 'consecutive-negative',
      type: 'danger',
      title: 'Gastas más de lo que ganas',
      message: `Llevas ${consecutiveNegativeQuincenas} quincenas consecutivas con gastos superiores a tus ingresos. Esto erosiona tu patrimonio.`,
      actionable: 'Crea un presupuesto de emergencia: identifica los 3 gastos más altos y encuentra cómo reducirlos al menos un 10%.',
    });
  } else if (consecutiveNegativeQuincenas === 1) {
    alerts.push({
      id: 'negative-quincena',
      type: 'warning',
      title: 'Quincena con déficit',
      message: 'Esta quincena tus gastos superaron tus ingresos. Si se repite, puede volverse un problema.',
      actionable: 'Revisa tus gastos variables y asegúrate de no comprometerte con gastos fijos adicionales.',
    });
  }

  // 4. High debt ratio
  if (debtToIncomeRatio > FINANCIAL_THRESHOLDS.MAX_DEBT_RATIO) {
    const pct = Math.round(debtToIncomeRatio * 100);
    alerts.push({
      id: 'high-debt-ratio',
      type: 'warning',
      title: 'Carga de deuda alta',
      message: `Tus pagos de deuda representan el ${pct}% de tu ingreso neto (máximo saludable: 40%).`,
      actionable: 'Considera la estrategia Avalancha para reducir el costo total de intereses y liberar flujo de caja más rápido.',
    });
  }

  // 5. Positive reinforcement
  if (alerts.length === 0) {
    alerts.push({
      id: 'on-track',
      type: 'info',
      title: '¡Vas por buen camino!',
      message: 'Tus finanzas están dentro de los parámetros saludables esta quincena.',
      actionable: 'Considera aumentar tu ahorro al 25% si tu situación lo permite.',
    });
  }

  return alerts;
}

export function generateRecommendations(input: AnalyticsInput): string[] {
  const recommendations: string[] = [];
  const { netIncome, categorySpends, debtToIncomeRatio } = input;

  const totalExpenses = categorySpends.reduce((sum, s) => sum + s.amount, 0);
  const savingsRate = Math.max(0, (netIncome - totalExpenses) / netIncome);

  if (savingsRate < 0.10) {
    recommendations.push(
      `💡 Regla 50/30/20: destina el 50% a necesidades ($${(netIncome * 0.5).toFixed(2)}), 30% a deseos ($${(netIncome * 0.3).toFixed(2)}) y 20% a ahorro ($${(netIncome * 0.2).toFixed(2)}).`
    );
  }

  if (debtToIncomeRatio > 0.3) {
    recommendations.push(
      '💡 Destina cualquier ingreso extra (horas adicionales, bonos) directamente a pagar tu deuda de mayor interés.'
    );
  }

  const entertainment = categorySpends.find(s => s.category === 'ENTRETENIMIENTO');
  if (entertainment && entertainment.percentage > 0.15) {
    recommendations.push(
      `💡 Considera revisar tus suscripciones de entretenimiento. Cancelar servicios no usados puede liberar $${(entertainment.amount * 0.3).toFixed(2)}/quincena.`
    );
  }

  recommendations.push(
    '💡 Construye un fondo de emergencia de 3 meses de gastos. ' +
    `Tu objetivo: $${(totalExpenses * 3).toFixed(2)}.`
  );

  return recommendations;
}
