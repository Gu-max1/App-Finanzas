'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useDashboardStore } from '@/store/dashboardStore';
import { formatCurrency, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/formatters';
import type { DashboardData, NetWorthPanel } from '@/types';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts';

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? 'text-green-600 bg-green-50 border-green-200' :
    score >= 60 ? 'text-blue-600 bg-blue-50 border-blue-200' :
    score >= 40 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
    'text-red-600 bg-red-50 border-red-200';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold ${color}`}>
      <span className="text-lg font-bold">{score}</span>
      <span>{label}</span>
    </div>
  );
}

function AlertBanner({ alerts }: { alerts: DashboardData['alerts'] }) {
  if (alerts.length === 0) return null;
  const colorMap = {
    danger: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div key={alert.id} className={`border rounded-lg p-4 ${colorMap[alert.type]}`}>
          <p className="font-semibold text-sm">{alert.title}</p>
          <p className="text-sm mt-1">{alert.message}</p>
          <p className="text-xs mt-2 opacity-80 italic">{alert.actionable}</p>
        </div>
      ))}
    </div>
  );
}

function NetWorthSection({ panel }: { panel: NetWorthPanel }) {
  const semaphoreConfig = {
    verde: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', dot: 'bg-green-500', emoji: '🟢' },
    amarillo: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', dot: 'bg-yellow-500', emoji: '🟡' },
    rojo: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', dot: 'bg-red-500', emoji: '🔴' },
  };
  const cfg = semaphoreConfig[panel.semaphore];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Panorama Financiero Total</h3>
        <Link href="/bank-accounts" className="text-xs text-primary-600 hover:underline">Ver cuentas →</Link>
      </div>

      {panel.bankAccountsCount === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-3xl mb-2">🏦</p>
          <p className="text-sm">Agrega tus cuentas bancarias para ver tu patrimonio neto.</p>
          <Link href="/bank-accounts" className="btn-primary text-sm mt-3 inline-block">+ Agregar cuentas</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Net worth breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-green-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Activos bancarios</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(panel.totalBankAssets)}</p>
            </div>
            <div className="text-center bg-red-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Deudas bancarias</p>
              <p className="text-lg font-bold text-red-600">-{formatCurrency(panel.totalBankDebts)}</p>
            </div>
            <div className={`text-center rounded-lg p-3 ${panel.netWorth >= 0 ? 'bg-blue-50' : 'bg-red-100'}`}>
              <p className="text-xs text-gray-500 mb-1">Patrimonio Neto</p>
              <p className={`text-lg font-bold ${panel.netWorth >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(panel.netWorth)}
              </p>
            </div>
          </div>

          {/* Semaphore */}
          <div className={`border rounded-lg p-3 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{cfg.emoji}</span>
              <span className={`font-semibold text-sm ${cfg.text}`}>
                Salud financiera: {panel.semaphore === 'verde' ? 'Buena' : panel.semaphore === 'amarillo' ? 'Precaución' : 'Crítica'}
              </span>
            </div>
            <p className={`text-xs ${cfg.text}`}>{panel.semaphoreMessage}</p>
          </div>

          {/* Debt-to-income ratio */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Ratio deuda/ingreso mensual</span>
              <span className={`font-semibold ${panel.debtToIncomeMonthly > 50 ? 'text-red-600' : panel.debtToIncomeMonthly > 35 ? 'text-yellow-600' : 'text-green-600'}`}>
                {panel.debtToIncomeMonthly.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${panel.debtToIncomeMonthly > 50 ? 'bg-red-500' : panel.debtToIncomeMonthly > 35 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, panel.debtToIncomeMonthly)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>0%</span><span className="text-green-600">35% saludable</span><span className="text-yellow-600">50%</span><span>100%</span>
            </div>
          </div>

          {/* Debt-free projection */}
          {panel.debtFreeProjection && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary-700 mb-1">Proyección libre de deudas</p>
              <p className="text-xs text-primary-600">{panel.debtFreeProjection.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error, setData, setLoading, setError } = useDashboardStore();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/analytics/dashboard');
        setData(res.data.data as DashboardData);
      } catch {
        setError('No se pudo cargar el dashboard');
      }
    };
    fetchData();
  }, [refreshKey, setData, setLoading, setError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button onClick={() => setRefreshKey((k) => k + 1)} className="btn-primary mt-4">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, charts, alerts, recommendations, financialScore } = data;
  const pieData = charts.categoryData.map((c) => ({
    name: CATEGORY_LABELS[c.category] ?? c.category,
    value: c.amount,
    color: CATEGORY_COLORS[c.category] ?? '#6b7280',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Financiero</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de tu quincena actual</p>
        </div>
        <ScoreBadge score={financialScore.score} label={financialScore.label} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Capital disponible</p>
          <p className={`text-2xl font-bold mt-1 ${summary.availableBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.availableBalance)}
          </p>
          <p className="text-xs text-gray-400 mt-1">De {formatCurrency(summary.netIncome)} neto</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gastos esta quincena</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{formatCurrency(summary.totalExpensesThisPeriod)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Deuda total pendiente</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(summary.totalDebtPending)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Meta principal</p>
          {summary.primaryGoal ? (
            <>
              <p className="text-sm font-semibold mt-1 text-gray-800 truncate">{summary.primaryGoal.name}</p>
              <ProgressBar percent={summary.primaryGoal.progressPercent} label="" />
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-2">Sin meta activa</p>
          )}
        </div>
      </div>

      {/* Net Worth Panel */}
      {data.netWorthPanel && <NetWorthSection panel={data.netWorthPanel} />}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line chart — balance history */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Evolución últimas quincenas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.periodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="income" name="Ingresos" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Gastos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — category breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Distribución de gastos</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sin gastos registrados
            </div>
          )}
          <div className="mt-3 space-y-1">
            {pieData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Balance Line Chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Saldo neto por quincena</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={charts.periodData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Line type="monotone" dataKey="balance" name="Balance" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Alertas activas</h3>
          <AlertBanner alerts={alerts} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Recomendaciones</h3>
          <ul className="space-y-3">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
