export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100) / 100}%`;
}

export const CATEGORY_LABELS: Record<string, string> = {
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

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CORRIENTE: 'Cuenta Corriente',
  AHORROS: 'Cuenta de Ahorros',
  INVERSION: 'Inversión',
};

export const DEBT_TYPE_LABELS: Record<string, string> = {
  PRESTAMO_PERSONAL: 'Préstamo Personal',
  HIPOTECA: 'Hipoteca',
  PRESTAMO_AUTO: 'Préstamo de Auto',
  TARJETA_CREDITO: 'Tarjeta de Crédito',
  LINEA_CREDITO: 'Línea de Crédito',
};

export const PANAMA_BANKS = [
  'Banistmo', 'BAC Credomatic', 'Banco General', 'Global Bank',
  'Multibank', 'Scotiabank', 'Caja de Ahorros', 'Banco Nacional de Panamá',
  'Credicorp Bank', 'Banco Aliado', 'Metrobank', 'Otro',
];

export const BANK_COLORS: Record<string, string> = {
  'Banistmo': '#003087',
  'BAC Credomatic': '#E31837',
  'Banco General': '#005BAA',
  'Global Bank': '#F7941D',
  'Multibank': '#00833E',
  'Scotiabank': '#EC111A',
  'Caja de Ahorros': '#003DA5',
  'Banco Nacional de Panamá': '#0072BC',
  'Credicorp Bank': '#002FA7',
  'Banco Aliado': '#2C3E7A',
  'Metrobank': '#00B2A9',
  'Otro': '#6b7280',
};

export const CATEGORY_COLORS: Record<string, string> = {
  ALIMENTACION: '#10b981',
  TRANSPORTE: '#3b82f6',
  SALUD: '#ef4444',
  ENTRETENIMIENTO: '#f59e0b',
  SERVICIOS: '#8b5cf6',
  EDUCACION: '#06b6d4',
  VIVIENDA: '#f97316',
  ROPA: '#ec4899',
  TECNOLOGIA: '#6366f1',
  OTROS: '#6b7280',
};
