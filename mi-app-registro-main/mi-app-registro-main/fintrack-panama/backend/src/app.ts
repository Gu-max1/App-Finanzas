import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from '@config/env';
import { globalRateLimiter } from '@middleware/rateLimiter';
import { errorHandler } from '@middleware/errorHandler';

// Route imports
import authRoutes from '@modules/auth/auth.routes';
import incomeRoutes from '@modules/income/income.routes';
import expenseRoutes from '@modules/expenses/expenses.routes';
import debtRoutes from '@modules/debts/debts.routes';
import savingsRoutes from '@modules/savings/savings.routes';
import analyticsRoutes from '@modules/analytics/analytics.routes';
import bankAccountsRoutes from '@modules/bankAccounts/bankAccounts.routes';
import bankDebtsRoutes from '@modules/bankDebts/bankDebts.routes';

const app = express();

// ─── CORS — raw middleware, no package magic ───────────────────────────────────
// Builds the explicit allow-list from env vars
const allowedList = [
  ...env.FRONTEND_URL.split(','),
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : []),
].map((u) => u.trim().replace(/\/$/, '')).filter(Boolean);

console.log('[CORS] Allowed origins list:', allowedList);

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // server-to-server / curl / Postman
  if (origin.endsWith('.vercel.app')) return true; // all Vercel deployments
  if (allowedList.includes(origin)) return true;
  if (env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) return true;
  return false;
}

// This middleware runs before everything else and sets CORS headers directly
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  console.log(`[CORS] ${req.method} ${req.path} — origin: ${origin ?? '(none)'}`);

  if (isOriginAllowed(origin)) {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  // Respond to preflight immediately — no further middleware needed
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,          // Not needed for a JSON API
    crossOriginEmbedderPolicy: false,      // Would block cross-origin requests
    crossOriginResourcePolicy: false,      // Would override CORS with same-origin restriction
    hsts: env.NODE_ENV === 'production',
  })
);

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/income`, incomeRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.use(`${API_PREFIX}/debts`, debtRoutes);
app.use(`${API_PREFIX}/savings`, savingsRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/bank-accounts`, bankAccountsRoutes);
app.use(`${API_PREFIX}/bank-debts`, bankDebtsRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
