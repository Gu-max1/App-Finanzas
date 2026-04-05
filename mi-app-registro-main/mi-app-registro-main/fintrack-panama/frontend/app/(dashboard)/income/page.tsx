'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { IncomeRecord } from '@/types';

const incomeSchema = z.object({
  periodStart: z.string().min(1, 'Requerido'),
  periodEnd: z.string().min(1, 'Requerido'),
  grossAmount: z.coerce.number().positive('Monto debe ser positivo'),
  includesIfarhu: z.boolean().default(false),
  otherDeductions: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});
type IncomeForm = z.infer<typeof incomeSchema>;

export default function IncomePage() {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ css: number; edu: number; net: number } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IncomeForm>({ resolver: zodResolver(incomeSchema) });

  const gross = watch('grossAmount');
  const includesIfarhu = watch('includesIfarhu');
  const otherDeductions = watch('otherDeductions');

  useEffect(() => {
    if (gross > 0) {
      const css = gross * 0.0975;
      const edu = gross * 0.0125;
      const ifarhu = includesIfarhu ? gross * 0.005 : 0;
      const other = otherDeductions || 0;
      setPreview({
        css: Math.round(css * 100) / 100,
        edu: Math.round(edu * 100) / 100,
        net: Math.round((gross - css - edu - ifarhu - other) * 100) / 100,
      });
    }
  }, [gross, includesIfarhu, otherDeductions]);

  const fetchRecords = async () => {
    try {
      const res = await api.get('/income?limit=12');
      setRecords(res.data.data.records);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const onSubmit = async (data: IncomeForm) => {
    await api.post('/income', {
      ...data,
      periodStart: new Date(data.periodStart + 'T12:00:00').toISOString(),
      periodEnd: new Date(data.periodEnd + 'T12:00:00').toISOString(),
    });
    reset();
    setShowForm(false);
    setPreview(null);
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de ingreso?')) return;
    await api.delete(`/income/${id}`);
    fetchRecords();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingresos Quincenales</h1>
          <p className="text-gray-500 text-sm mt-1">Registra tus salarios y ve tus deducciones panameñas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nueva Quincena'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar ingreso quincenal</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Inicio de período</label>
                <input type="date" className="input-field" {...register('periodStart')} />
                {errors.periodStart && <p className="error-text">{errors.periodStart.message}</p>}
              </div>
              <div>
                <label className="label">Fin de período</label>
                <input type="date" className="input-field" {...register('periodEnd')} />
              </div>
            </div>
            <div>
              <label className="label">Salario bruto (USD)</label>
              <input type="number" step="0.01" className="input-field" placeholder="850.00" {...register('grossAmount')} />
              {errors.grossAmount && <p className="error-text">{errors.grossAmount.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ifarhu" className="rounded" {...register('includesIfarhu')} />
              <label htmlFor="ifarhu" className="text-sm text-gray-700">Incluye descuento IFARHU (0.5%)</label>
            </div>
            <div>
              <label className="label">Otras deducciones (USD)</label>
              <input type="number" step="0.01" className="input-field" placeholder="0.00" {...register('otherDeductions')} />
            </div>

            {preview && preview.net > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-green-800 mb-2">Vista previa de deducciones:</p>
                <div className="space-y-1 text-green-700">
                  <div className="flex justify-between">
                    <span>CSS (9.75%)</span>
                    <span>-{formatCurrency(preview.css)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seguro Educativo (1.25%)</span>
                    <span>-{formatCurrency(preview.edu)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-green-300">
                    <span>Salario neto</span>
                    <span className="text-green-900">{formatCurrency(preview.net)}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="label">Notas (opcional)</label>
              <textarea className="input-field" rows={2} {...register('notes')} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar ingreso'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
        </div>
      ) : records.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">💵</p>
          <p>No hay registros de ingresos aún.</p>
          <p className="text-sm mt-1">Registra tu primera quincena haciendo clic en "Nueva Quincena".</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {formatDate(r.periodStart)} — {formatDate(r.periodEnd)}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Bruto: <span className="font-medium text-gray-800">{formatCurrency(r.grossAmount)}</span></span>
                    <span>CSS: <span className="text-red-500">-{formatCurrency(r.cssDeduction)}</span></span>
                    <span>Edu: <span className="text-red-500">-{formatCurrency(r.educativoDeduction)}</span></span>
                    <span>Neto: <span className="font-semibold text-green-600">{formatCurrency(r.netAmount)}</span></span>
                  </div>
                  {r._count && (
                    <p className="text-xs text-gray-400">{r._count.expenses} gastos registrados</p>
                  )}
                </div>
                <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500 text-sm ml-4">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
