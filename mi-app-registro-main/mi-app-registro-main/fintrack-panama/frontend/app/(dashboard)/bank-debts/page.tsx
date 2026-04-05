'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, DEBT_TYPE_LABELS, PANAMA_BANKS } from '@/lib/formatters';
import type { BankDebt } from '@/types';

const DEBT_TYPES = [
  { value: 'PRESTAMO_PERSONAL', label: 'Préstamo Personal' },
  { value: 'HIPOTECA', label: 'Hipoteca' },
  { value: 'PRESTAMO_AUTO', label: 'Préstamo de Auto' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta de Crédito' },
  { value: 'LINEA_CREDITO', label: 'Línea de Crédito' },
];

const debtSchema = z.object({
  creditorBank: z.string().min(1, 'Banco acreedor requerido'),
  debtType: z.enum(['PRESTAMO_PERSONAL', 'HIPOTECA', 'PRESTAMO_AUTO', 'TARJETA_CREDITO', 'LINEA_CREDITO']),
  originalAmount: z.coerce.number().positive(),
  remainingBalance: z.coerce.number().min(0),
  annualRate: z.coerce.number().min(0).max(1, 'Tasa anual como decimal (ej: 0.15 para 15%)'),
  monthlyPayment: z.coerce.number().positive(),
  startDate: z.string().min(1),
  paymentDay: z.coerce.number().int().min(1).max(31).default(1),
  // Credit card fields
  creditLimit: z.coerce.number().positive().optional(),
  currentBalance: z.coerce.number().min(0).optional(),
  minimumPayment: z.coerce.number().positive().optional(),
  cutoffDay: z.coerce.number().int().min(1).max(31).optional(),
  paymentDueDay: z.coerce.number().int().min(1).max(31).optional(),
  notes: z.string().optional(),
});
type DebtForm = z.infer<typeof debtSchema>;

const extraSimSchema = z.object({ extraMonthlyAmount: z.coerce.number().positive() });
type ExtraSimForm = z.infer<typeof extraSimSchema>;

interface CreditCardAnalysis {
  utilizationPercent: number;
  utilizationAlert: boolean;
  utilizationRecommendation: string;
  availableCredit: number;
  minimumPaymentAnalysis: { monthsToPayOff: number; totalInterestIfMinOnly: number; warning: string };
  nextCutoff: string;
  nextPaymentDue: string;
}

interface SimulationResult {
  base: { months: number; totalInterest: number; payoffDate: string };
  withExtra: { months: number; totalInterest: number; payoffDate: string; extraMonthlyAmount: number };
  savings: { monthsSaved: number; interestSaved: number; message: string };
}

export default function BankDebtsPage() {
  const [debts, setDebts] = useState<BankDebt[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [strategies, setStrategies] = useState<{ snowball: { totalInterestPaid: number; payoffMonths: number } | null; avalanche: { totalInterestPaid: number; payoffMonths: number } | null; recommendation: string } | null>(null);
  const [projection, setProjection] = useState<{ isDebtFree: boolean; estimatedMonths?: number; debtFreeDate?: string; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'strategies' | 'projection'>('list');
  const [selectedDebt, setSelectedDebt] = useState<string | null>(null);
  const [ccAnalysis, setCcAnalysis] = useState<CreditCardAnalysis | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<DebtForm>({
    resolver: zodResolver(debtSchema),
    defaultValues: { debtType: 'PRESTAMO_PERSONAL', paymentDay: 1 },
  });

  const { register: regSim, handleSubmit: handleSim, formState: { isSubmitting: isSim } } = useForm<ExtraSimForm>({
    resolver: zodResolver(extraSimSchema),
  });

  const debtTypeWatch = watch('debtType');
  const isCreditCard = debtTypeWatch === 'TARJETA_CREDITO';

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [debtRes, stratRes, projRes] = await Promise.all([
        api.get('/bank-debts'),
        api.get('/bank-debts/strategies'),
        api.get('/bank-debts/projection'),
      ]);
      setDebts(debtRes.data.data.debts);
      setTotalDebt(debtRes.data.data.totalDebt);
      setTotalMonthly(debtRes.data.data.totalMonthlyPayments);
      if (stratRes.data.data.snowball) setStrategies(stratRes.data.data);
      setProjection(projRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const onSubmit = async (data: DebtForm) => {
    await api.post('/bank-debts', { ...data, startDate: new Date(data.startDate + 'T12:00:00').toISOString() });
    reset();
    setShowForm(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta deuda bancaria?')) return;
    await api.delete(`/bank-debts/${id}`);
    fetchAll();
  };

  const loadCCAnalysis = async (id: string) => {
    const res = await api.get(`/bank-debts/${id}/credit-card-analysis`);
    setCcAnalysis(res.data.data);
    setSelectedDebt(id);
  };

  const onSimulate = async (data: ExtraSimForm) => {
    if (!selectedDebt) return;
    const res = await api.post(`/bank-debts/${selectedDebt}/simulate-extra`, data);
    setSimulation(res.data.data);
  };

  const paidPercent = (debt: BankDebt) =>
    Math.round(((Number(debt.originalAmount) - Number(debt.remainingBalance)) / Number(debt.originalAmount)) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deudas Bancarias</h1>
          <div className="flex gap-4 text-sm text-gray-500 mt-1">
            <span>Total pendiente: <span className="font-semibold text-red-600">{formatCurrency(totalDebt)}</span></span>
            <span>Pago mensual: <span className="font-semibold text-gray-700">{formatCurrency(totalMonthly)}</span></span>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nueva Deuda'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar deuda bancaria</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Banco acreedor</label>
                <select className="input-field" {...register('creditorBank')}>
                  <option value="">Seleccionar...</option>
                  {PANAMA_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {errors.creditorBank && <p className="error-text">{errors.creditorBank.message}</p>}
              </div>
              <div>
                <label className="label">Tipo de deuda</label>
                <select className="input-field" {...register('debtType')}>
                  {DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Monto original (USD)</label>
                <input type="number" step="0.01" className="input-field" {...register('originalAmount')} />
              </div>
              <div>
                <label className="label">Saldo pendiente (USD)</label>
                <input type="number" step="0.01" className="input-field" {...register('remainingBalance')} />
              </div>
              <div>
                <label className="label">Cuota mensual (USD)</label>
                <input type="number" step="0.01" className="input-field" {...register('monthlyPayment')} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Tasa anual (TEA decimal)</label>
                <input type="number" step="0.001" placeholder="0.15" className="input-field" {...register('annualRate')} />
                {errors.annualRate && <p className="error-text">{errors.annualRate.message}</p>}
              </div>
              <div>
                <label className="label">Fecha inicio</label>
                <input type="date" className="input-field" {...register('startDate')} />
              </div>
              <div>
                <label className="label">Día de débito</label>
                <input type="number" min="1" max="31" className="input-field" {...register('paymentDay')} />
              </div>
            </div>

            {/* Credit card specific fields */}
            {isCreditCard && (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">Campos de Tarjeta de Crédito</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Límite de crédito</label>
                    <input type="number" step="0.01" className="input-field" {...register('creditLimit')} />
                  </div>
                  <div>
                    <label className="label">Saldo actual</label>
                    <input type="number" step="0.01" className="input-field" {...register('currentBalance')} />
                  </div>
                  <div>
                    <label className="label">Pago mínimo</label>
                    <input type="number" step="0.01" className="input-field" {...register('minimumPayment')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Día de corte</label>
                    <input type="number" min="1" max="31" className="input-field" {...register('cutoffDay')} />
                  </div>
                  <div>
                    <label className="label">Día de pago</label>
                    <input type="number" min="1" max="31" className="input-field" {...register('paymentDueDay')} />
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar deuda'}
            </button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['list', 'strategies', 'projection'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab === 'list' ? 'Deudas' : tab === 'strategies' ? 'Estrategias' : 'Proyección'}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
        ) : debts.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">✅</p>
            <p>No hay deudas bancarias activas. ¡Excelente!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {debts.map((debt) => (
              <div key={debt.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{debt.creditorBank}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {DEBT_TYPE_LABELS[debt.debtType]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Desde {formatDate(debt.startDate)} · Débito día {debt.paymentDay} · Tasa {(parseFloat(debt.annualRate) * 100).toFixed(1)}% TEA
                    </p>
                  </div>
                  <button onClick={() => handleDelete(debt.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Original</p>
                    <p className="font-semibold">{formatCurrency(debt.originalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pendiente</p>
                    <p className="font-semibold text-red-600">{formatCurrency(debt.remainingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Cuota mensual</p>
                    <p className="font-semibold">{formatCurrency(debt.monthlyPayment)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Pagado</span><span>{paidPercent(debt)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${paidPercent(debt)}%` }} />
                  </div>
                </div>

                {/* Credit card analysis */}
                {debt.debtType === 'TARJETA_CREDITO' && (
                  <div className="mt-2 space-y-2">
                    <button onClick={() => loadCCAnalysis(debt.id)}
                      className="text-xs text-blue-600 hover:underline font-medium">
                      Ver análisis de tarjeta
                    </button>
                    {selectedDebt === debt.id && ccAnalysis && (
                      <div className={`rounded-lg p-3 text-sm border ${ccAnalysis.utilizationAlert ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                        <p className="font-medium mb-1">{ccAnalysis.utilizationAlert ? '⚠️' : '✅'} Uso: {ccAnalysis.utilizationPercent}% del límite</p>
                        <p className="text-xs text-gray-600 mb-1">{ccAnalysis.utilizationRecommendation}</p>
                        <p className="text-xs text-gray-600 mb-1">Crédito disponible: {formatCurrency(ccAnalysis.availableCredit)}</p>
                        <p className="text-xs text-red-600">{ccAnalysis.minimumPaymentAnalysis.warning}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Corte: {formatDate(ccAnalysis.nextCutoff)}</span>
                          <span>Pago: {formatDate(ccAnalysis.nextPaymentDue)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Extra payment simulation */}
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <button onClick={() => setSelectedDebt(selectedDebt === debt.id ? null : debt.id)}
                    className="text-xs text-primary-600 hover:underline">
                    {selectedDebt === debt.id ? 'Cerrar simulación' : '¿Cuánto ahorro con cuota extra?'}
                  </button>
                  {selectedDebt === debt.id && debt.debtType !== 'TARJETA_CREDITO' && (
                    <div className="mt-2 space-y-2">
                      <form onSubmit={handleSim(onSimulate)} className="flex gap-2">
                        <input type="number" step="0.01" placeholder="Monto extra mensual" className="input-field text-sm flex-1"
                          {...regSim('extraMonthlyAmount')} />
                        <button type="submit" className="btn-primary text-xs py-1.5 px-3" disabled={isSim}>Simular</button>
                      </form>
                      {simulation && (
                        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-sm">
                          <p className="font-semibold text-primary-800 mb-2">{simulation.savings.message}</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-white rounded p-2">
                              <p className="text-gray-500">Sin cuota extra</p>
                              <p className="font-medium">{simulation.base.months} meses</p>
                              <p className="text-red-500">{formatCurrency(simulation.base.totalInterest)} en intereses</p>
                            </div>
                            <div className="bg-white rounded p-2">
                              <p className="text-gray-500">Con cuota extra</p>
                              <p className="font-medium text-green-600">{simulation.withExtra.months} meses</p>
                              <p className="text-green-600">{formatCurrency(simulation.withExtra.totalInterest)} en intereses</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'strategies' && (
        <div className="space-y-4">
          {strategies ? (
            <>
              <p className="text-sm bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                {strategies.recommendation}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'snowball', title: '🏔️ Bola de Nieve', desc: 'Primero la deuda más pequeña', data: strategies.snowball },
                  { key: 'avalanche', title: '🌊 Avalancha', desc: 'Primero la deuda con mayor interés', data: strategies.avalanche },
                ].map(({ key, title, desc, data }) => data ? (
                  <div key={key} className="card">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{desc}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Meses</span><span className="font-semibold">{data.payoffMonths}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Total intereses</span><span className="font-semibold text-red-600">{formatCurrency(data.totalInterestPaid)}</span></div>
                    </div>
                  </div>
                ) : null)}
              </div>
            </>
          ) : (
            <div className="card text-center py-8 text-gray-500">
              <p>Registra al menos una deuda para ver las estrategias de pago.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'projection' && (
        <div className="card">
          {projection ? (
            projection.isDebtFree ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-xl font-bold text-green-600">{projection.message}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">Proyección de liquidación total</h3>
                <p className="text-gray-700">{projection.message}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary-600">{projection.estimatedMonths}</p>
                    <p className="text-sm text-gray-500 mt-1">meses restantes</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {projection.debtFreeDate ? new Date(projection.debtFreeDate).toLocaleDateString('es-PA', { month: 'long', year: 'numeric' }) : '-'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">fecha estimada libre de deudas</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  Esta proyección asume que mantienes tus pagos actuales sin interrupciones. Aumentar las cuotas acortará este plazo significativamente.
                </p>
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
