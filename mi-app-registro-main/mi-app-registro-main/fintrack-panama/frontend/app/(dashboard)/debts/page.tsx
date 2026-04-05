'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Debt } from '@/types';

const debtSchema = z.object({
  creditorName: z.string().min(1, 'Nombre del acreedor requerido'),
  totalAmount: z.coerce.number().positive(),
  remainingAmount: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(1, 'Ingresa la tasa como decimal (ej: 0.18 para 18%)'),
  monthlyPayment: z.coerce.number().positive(),
  startDate: z.string().min(1),
  notes: z.string().optional(),
});
type DebtForm = z.infer<typeof debtSchema>;

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [strategies, setStrategies] = useState<{
    snowball: { totalInterestPaid: number; payoffMonths: number; order: Array<{creditorName: string}> } | null;
    avalanche: { totalInterestPaid: number; payoffMonths: number; order: Array<{creditorName: string}> } | null;
    recommendation: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'strategies'>('list');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DebtForm>({
    resolver: zodResolver(debtSchema),
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [debtRes, stratRes] = await Promise.all([
        api.get('/debts'),
        api.get('/debts/strategies'),
      ]);
      setDebts(debtRes.data.data.debts);
      if (stratRes.data.data.snowball) {
        setStrategies(stratRes.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const onSubmit = async (data: DebtForm) => {
    await api.post('/debts', { ...data, startDate: new Date(data.startDate + 'T12:00:00').toISOString() });
    reset();
    setShowForm(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta deuda?')) return;
    await api.delete(`/debts/${id}`);
    fetchAll();
  };

  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.remainingAmount), 0);
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + parseFloat(d.monthlyPayment), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deudas</h1>
          <p className="text-gray-500 text-sm mt-1">
            Total pendiente: <span className="font-semibold text-red-600">{formatCurrency(totalDebt)}</span>
            {' · '}Pago mensual: <span className="font-semibold">{formatCurrency(totalMonthlyPayment)}</span>
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nueva Deuda'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar deuda</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Acreedor</label>
                <input className="input-field" placeholder="Banco General" {...register('creditorName')} />
                {errors.creditorName && <p className="error-text">{errors.creditorName.message}</p>}
              </div>
              <div>
                <label className="label">Fecha inicio</label>
                <input type="date" className="input-field" {...register('startDate')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Monto total (USD)</label>
                <input type="number" step="0.01" className="input-field" {...register('totalAmount')} />
              </div>
              <div>
                <label className="label">Saldo pendiente (USD)</label>
                <input type="number" step="0.01" className="input-field" {...register('remainingAmount')} />
              </div>
              <div>
                <label className="label">Cuota mensual (USD)</label>
                <input type="number" step="0.01" className="input-field" {...register('monthlyPayment')} />
              </div>
            </div>
            <div>
              <label className="label">Tasa anual (ej: 0.18 = 18%)</label>
              <input type="number" step="0.0001" className="input-field" placeholder="0.18" {...register('interestRate')} />
              {errors.interestRate && <p className="error-text">{errors.interestRate.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar deuda'}
            </button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['list', 'strategies'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'list' ? 'Lista de deudas' : 'Estrategias de pago'}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
        ) : debts.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🏦</p>
            <p>No hay deudas registradas. ¡Excelente!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {debts.map((debt) => {
              const progress = Math.round(
                ((parseFloat(debt.totalAmount) - parseFloat(debt.remainingAmount)) / parseFloat(debt.totalAmount)) * 100
              );
              return (
                <div key={debt.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{debt.creditorName}</p>
                      <p className="text-xs text-gray-500">
                        Desde {formatDate(debt.startDate)} · Tasa: {(parseFloat(debt.interestRate) * 100).toFixed(1)}% anual
                      </p>
                    </div>
                    <button onClick={() => handleDelete(debt.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-semibold">{formatCurrency(debt.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pendiente</p>
                      <p className="font-semibold text-red-600">{formatCurrency(debt.remainingAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cuota mensual</p>
                      <p className="font-semibold">{formatCurrency(debt.monthlyPayment)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progreso de pago</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {activeTab === 'strategies' && strategies && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 p-4 rounded-lg">
            {strategies.recommendation}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'snowball', title: 'Bola de Nieve', desc: 'Paga primero la deuda más pequeña', data: strategies.snowball },
              { key: 'avalanche', title: 'Avalancha', desc: 'Paga primero la deuda con mayor interés', data: strategies.avalanche },
            ].map(({ key, title, desc, data }) =>
              data ? (
                <div key={key} className="card">
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-xs text-gray-500 mb-3">{desc}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Meses para liquidar</span>
                      <span className="font-semibold">{data.payoffMonths}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total en intereses</span>
                      <span className="font-semibold text-red-600">{formatCurrency(data.totalInterestPaid)}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Orden de pago:</p>
                    <ol className="text-xs space-y-1">
                      {data.order.map((d, i) => (
                        <li key={i} className="text-gray-700">{i + 1}. {d.creditorName}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
