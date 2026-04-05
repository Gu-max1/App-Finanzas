'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatCurrency, ACCOUNT_TYPE_LABELS, PANAMA_BANKS, BANK_COLORS } from '@/lib/formatters';
import type { BankAccount, BankAccountDistribution } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const accountSchema = z.object({
  bankName: z.string().min(1, 'Banco requerido'),
  accountType: z.enum(['CORRIENTE', 'AHORROS', 'INVERSION']),
  balance: z.coerce.number().min(0, 'El saldo no puede ser negativo'),
  alias: z.string().max(80).optional(),
  isPrimary: z.boolean().default(false),
});
type AccountForm = z.infer<typeof accountSchema>;

const balanceSchema = z.object({ balance: z.coerce.number().min(0) });
type BalanceForm = z.infer<typeof balanceSchema>;

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [distribution, setDistribution] = useState<BankAccountDistribution[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [updatingBalanceId, setUpdatingBalanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customBank, setCustomBank] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { accountType: 'AHORROS', balance: 0, isPrimary: false },
  });

  const { register: regBal, handleSubmit: handleBal, reset: resetBal, formState: { isSubmitting: isBal } } = useForm<BalanceForm>({
    resolver: zodResolver(balanceSchema),
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bank-accounts');
      setAccounts(res.data.data.accounts);
      setDistribution(res.data.data.distribution);
      setTotalBalance(res.data.data.totalBalance);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const onSubmit = async (data: AccountForm) => {
    const bankName = useCustom ? customBank : data.bankName;
    await api.post('/bank-accounts', { ...data, bankName });
    reset();
    setCustomBank('');
    setUseCustom(false);
    setShowForm(false);
    fetchAccounts();
  };

  const onUpdateBalance = async (id: string, data: BalanceForm) => {
    await api.patch(`/bank-accounts/${id}/balance`, data);
    resetBal();
    setUpdatingBalanceId(null);
    fetchAccounts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta bancaria?')) return;
    await api.delete(`/bank-accounts/${id}`);
    fetchAccounts();
  };

  const bankWatch = watch('bankName');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas Bancarias</h1>
          <p className="text-gray-500 text-sm mt-1">
            Total consolidado: <span className="font-semibold text-green-600 text-base">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nueva Cuenta'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar cuenta bancaria</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Banco</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setUseCustom(false)}
                  className={`text-xs px-3 py-1 rounded-full border ${!useCustom ? 'bg-primary-600 text-white border-primary-600' : 'text-gray-600 border-gray-300'}`}>
                  Seleccionar
                </button>
                <button type="button" onClick={() => setUseCustom(true)}
                  className={`text-xs px-3 py-1 rounded-full border ${useCustom ? 'bg-primary-600 text-white border-primary-600' : 'text-gray-600 border-gray-300'}`}>
                  Otro banco
                </button>
              </div>
              {useCustom ? (
                <input className="input-field" placeholder="Nombre del banco" value={customBank} onChange={e => setCustomBank(e.target.value)} />
              ) : (
                <select className="input-field" {...register('bankName')}>
                  <option value="">Seleccionar banco...</option>
                  {PANAMA_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
              {errors.bankName && <p className="error-text">{errors.bankName.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo de cuenta</label>
                <select className="input-field" {...register('accountType')}>
                  <option value="CORRIENTE">Corriente</option>
                  <option value="AHORROS">Ahorros</option>
                  <option value="INVERSION">Inversión</option>
                </select>
              </div>
              <div>
                <label className="label">Saldo actual (USD)</label>
                <input type="number" step="0.01" className="input-field" placeholder="0.00" {...register('balance')} />
                {errors.balance && <p className="error-text">{errors.balance.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Alias (opcional)</label>
              <input className="input-field" placeholder="Ej: Mi cuenta nómina" {...register('alias')} />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPrimary" className="rounded" {...register('isPrimary')} />
              <label htmlFor="isPrimary" className="text-sm text-gray-700">
                Cuenta principal (para recibir el salario)
              </label>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar cuenta'}
            </button>
          </form>
        </div>
      )}

      {/* Distribution Chart */}
      {distribution.length > 1 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Distribución por banco</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distribution} layout="vertical">
              <XAxis type="number" tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="balance" radius={[0, 4, 4, 0]}>
                {distribution.map((entry, i) => (
                  <Cell key={i} fill={BANK_COLORS[entry.bankName] ?? '#0ea5e9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Account List */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🏦</p>
          <p>No hay cuentas bancarias registradas.</p>
          <p className="text-sm mt-1">Agrega tus cuentas para ver tu patrimonio total.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className={`card ${account.isPrimary ? 'border-primary-300 ring-1 ring-primary-200' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: BANK_COLORS[account.bankName] ?? '#0ea5e9' }}>
                    {account.bankName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{account.alias ?? account.bankName}</p>
                    <p className="text-xs text-gray-500">{account.bankName} · {ACCOUNT_TYPE_LABELS[account.accountType]}</p>
                  </div>
                </div>
                {account.isPrimary && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">Principal</span>
                )}
              </div>

              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(account.balance)}</p>
                <p className="text-xs text-gray-400">{account.currency}</p>
              </div>

              <div className="flex items-center gap-3 mt-4">
                {updatingBalanceId === account.id ? (
                  <form onSubmit={handleBal((d) => onUpdateBalance(account.id, d))} className="flex gap-2 w-full">
                    <input type="number" step="0.01" className="input-field text-sm flex-1" placeholder="Nuevo saldo" {...regBal('balance')} />
                    <button type="submit" className="btn-primary text-xs py-1.5 px-3" disabled={isBal}>Guardar</button>
                    <button type="button" className="btn-secondary text-xs py-1.5 px-3" onClick={() => setUpdatingBalanceId(null)}>✕</button>
                  </form>
                ) : (
                  <>
                    <button onClick={() => setUpdatingBalanceId(account.id)} className="text-xs text-primary-600 hover:underline">
                      Actualizar saldo
                    </button>
                    <button onClick={() => handleDelete(account.id)} className="text-xs text-red-400 hover:underline ml-auto">
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
