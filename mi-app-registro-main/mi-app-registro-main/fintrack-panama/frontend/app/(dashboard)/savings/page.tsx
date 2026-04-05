'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { SavingsGoal } from '@/types';

const goalSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.string().min(1),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});
type GoalForm = z.infer<typeof goalSchema>;

const contributionSchema = z.object({
  amount: z.coerce.number().positive('Monto positivo requerido'),
  date: z.string().min(1),
  notes: z.string().optional(),
});
type ContributionForm = z.infer<typeof contributionSchema>;

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contributingTo, setContributingTo] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
  });

  const {
    register: regContrib,
    handleSubmit: handleContrib,
    reset: resetContrib,
    formState: { isSubmitting: isContribSubmitting },
  } = useForm<ContributionForm>({ resolver: zodResolver(contributionSchema) });

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/savings');
      setGoals(res.data.data.goals);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const onSubmit = async (data: GoalForm) => {
    await api.post('/savings', { ...data, targetDate: new Date(data.targetDate + 'T12:00:00').toISOString() });
    reset();
    setShowForm(false);
    fetchGoals();
  };

  const onContribute = async (data: ContributionForm) => {
    if (!contributingTo) return;
    await api.post(`/savings/${contributingTo}/contributions`, {
      ...data,
      date: new Date(data.date + 'T12:00:00').toISOString(),
    });
    resetContrib();
    setContributingTo(null);
    fetchGoals();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta meta?')) return;
    await api.delete(`/savings/${id}`);
    fetchGoals();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metas de Ahorro</h1>
          <p className="text-gray-500 text-sm mt-1">{goals.length} metas activas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nueva Meta'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Crear meta de ahorro</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Nombre de la meta</label>
              <input className="input-field" placeholder="Fondo de emergencia" {...register('name')} />
              {errors.name && <p className="error-text">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Monto objetivo (USD)</label>
                <input type="number" step="0.01" className="input-field" {...register('targetAmount')} />
                {errors.targetAmount && <p className="error-text">{errors.targetAmount.message}</p>}
              </div>
              <div>
                <label className="label">Fecha límite</label>
                <input type="date" className="input-field" {...register('targetDate')} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPrimary" className="rounded" {...register('isPrimary')} />
              <label htmlFor="isPrimary" className="text-sm text-gray-700">Meta principal (aparece en el dashboard)</label>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear meta'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🎯</p>
          <p>No hay metas de ahorro aún.</p>
          <p className="text-sm mt-1">Crea tu primera meta de ahorro para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div key={goal.id} className={`card ${goal.isPrimary ? 'border-primary-300 ring-1 ring-primary-200' : ''}`}>
              {goal.isPrimary && (
                <span className="inline-block bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                  Meta principal
                </span>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Fecha límite: {formatDate(goal.targetDate)}</p>
                </div>
                <button onClick={() => handleDelete(goal.id)} className="text-xs text-red-400 hover:underline">
                  Eliminar
                </button>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{formatCurrency(goal.currentAmount)}</span>
                  <span className="font-medium">{formatCurrency(goal.targetAmount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${goal.isCompleted ? 'bg-green-500' : 'bg-primary-500'}`}
                    style={{ width: `${goal.progressPercent ?? 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{goal.progressPercent ?? 0}% completado</p>
              </div>

              {!goal.isCompleted && goal.biweeklyRequired !== undefined && (
                <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm">
                  <p className="text-blue-700">
                    Necesitas ahorrar <span className="font-semibold">{formatCurrency(goal.biweeklyRequired)}</span> por quincena
                    {goal.biweeklyPeriods ? ` durante ${goal.biweeklyPeriods} quincenas` : ''}.
                  </p>
                  {!goal.isAchievable && (
                    <p className="text-red-500 text-xs mt-1">La fecha límite ya pasó o está muy próxima.</p>
                  )}
                </div>
              )}

              {goal.isCompleted && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 font-medium">
                  ¡Meta cumplida!
                </div>
              )}

              {!goal.isCompleted && (
                <div className="mt-3">
                  {contributingTo === goal.id ? (
                    <form onSubmit={handleContrib(onContribute)} className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" step="0.01" placeholder="Monto" className="input-field text-sm" {...regContrib('amount')} />
                        <input type="date" className="input-field text-sm" {...regContrib('date')} />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-sm py-1 px-3" disabled={isContribSubmitting}>
                          Guardar
                        </button>
                        <button type="button" className="btn-secondary text-sm py-1 px-3" onClick={() => setContributingTo(null)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setContributingTo(goal.id)}
                      className="text-sm text-primary-600 hover:underline font-medium"
                    >
                      + Agregar contribución
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
