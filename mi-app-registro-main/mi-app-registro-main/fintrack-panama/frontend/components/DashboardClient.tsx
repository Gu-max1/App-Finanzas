'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import PwaInstallBanner from '@/components/PwaInstallBanner';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/income', label: 'Ingresos', icon: '💵' },
  { href: '/expenses', label: 'Gastos', icon: '💳' },
  { href: '/debts', label: 'Deudas (General)', icon: '💰' },
  { href: '/savings', label: 'Ahorro', icon: '🎯' },
  { href: '/bank-accounts', label: 'Cuentas Bancarias', icon: '🏦' },
  { href: '/bank-debts', label: 'Deudas Bancarias', icon: '📋' },
];

export function DashboardClient({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, tokens, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      if (tokens?.refreshToken) {
        await api.post('/auth/logout', { refreshToken: tokens.refreshToken });
      }
    } finally {
      localStorage.removeItem('fintrack_tokens');
      localStorage.removeItem('fintrack_auth');
      logout();
      router.push('/login');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-primary-700">FinTrack Panama</h1>
          <p className="text-xs text-gray-500 mt-1">
            Hola, {user?.firstName}
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border border-primary-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>

      {/* PWA install banner */}
      <PwaInstallBanner />
    </div>
  );
}
