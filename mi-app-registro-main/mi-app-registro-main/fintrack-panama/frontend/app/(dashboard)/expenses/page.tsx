'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/formatters';
import type { Expense, CategorySummary } from '@/types';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>;

const expenseSchema = z.object({
  category: z.string().min(1),
  amount: z.coerce.number().positive('Monto positivo requerido'),
  description: z.string().min(1, 'Descripción requerida'),
  date: z.string().min(1),
  type: z.enum(['FIJO', 'VARIABLE']).default('VARIABLE'),
  notes: z.string().optional(),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<CategorySummary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { type: 'VARIABLE' },
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [expRes, sumRes] = await Promise.all([
        api.get('/expenses?limit=50'),
        api.get('/expenses/summary'),
      ]);
      setExpenses(expRes.data.data.expenses);
      setSummary(sumRes.data.data.summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const onSubmit = async (data: ExpenseForm) => {
    const payload = { ...data, date: new Date(data.date + 'T12:00:00').toISOString() };
    if (editingId) {
      await api.patch(`/expenses/${editingId}`, payload);
      setEditingId(null);
    } else {
      await api.post('/expenses', payload);
    }
    reset();
    setShowForm(false);
    fetchAll();
  };

  const startEdit = (exp: Expense) => {
    setValue('category', exp.category);
    setValue('amount', parseFloat(exp.amount));
    setValue('description', exp.description);
    setValue('date', exp.date.split('T')[0]);
    setValue('type', exp.type);
    setEditingId(exp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await api.delete(`/expenses/${id}`);
    fetchAll();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-gray-500 text-sm mt-1">Total: <span className="font-semibold text-gray-700">{formatCurrency(totalExpenses)}</span></p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); reset(); }} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nuevo Gasto'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">{editingId ? 'Editar gasto' : 'Registrar gasto'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Categoría</label>
                <select className="input-field" {...register('category')}>
                  <option value="">Seleccionar...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
                {errors.category && <p className="error-text">{errors.category.message}</p>}
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input-field" {...register('type')}>
                  <option value="VARIABLE">Variable</option>
                  <option value="FIJO">Fijo</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Monto (USD)</label>
                <input type="number" step="0.01" className="input-field" placeholder="0.00" {...register('amount')} />
                {errors.amount && <p className="error-text">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="label">Fecha</label>
                <input type="date" className="input-field" {...register('date')} />
              </div>
            </div>
            <div>
              <label className="label">Descripción</label>
              <input type="text" className="input-field" placeholder="Ej: Supermercado El Rey" {...register('description')} />
              {errors.description && <p className="error-text">{errors.description.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar gasto'}
            </button>
          </form>
        </div>
      )}

      {/* Category Summary */}
      {summary.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Resumen por categoría</h3>
          <div className="space-y-2">
            {summary.map((item) => (
              <div key={item.category} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? '#6b7280' }} />
                <span className="text-sm text-gray-600 w-32">{CATEGORY_LABELS[item.category] ?? item.category}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: CATEGORY_COLORS[item.category] ?? '#6b7280' }} />
                </div>
                <span className="text-sm font-medium text-gray-700 w-20 text-right">{formatCurrency(item.amount)}</span>
                <span className="text-xs text-gray-400 w-12 text-right">{item.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense List */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
      ) : expenses.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">💳</p>
          <p>No hay gastos registrados aún.</p>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Historial de gastos</h3>
          <div className="divide-y divide-gray-100">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[exp.category] ?? '#6b7280' }} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{exp.description}</p>
                    <p className="text-xs text-gray-400">
                      {CATEGORY_LABELS[exp.category]} · {formatDate(exp.date)} · {exp.type === 'FIJO' ? 'Fijo' : 'Variable'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{formatCurrency(exp.amount)}</span>
                  <button onClick={() => startEdit(exp)} className="text-xs text-primary-600 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(exp.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
