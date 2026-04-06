import express from 'express';
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

// ─── CORS (must be BEFORE helmet to handle OPTIONS preflights correctly) ───────
const allowedList = [
  ...env.FRONTEND_URL.split(','),
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : []),
].map((u) => u.trim().replace(/\/$/, '')).filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app origin (covers all Vercel preview deployments)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow any explicitly configured origin
    if (allowedList.includes(origin)) return callback(null, true);
    // Allow localhost in development
    if (env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
};

// Handle preflight OPTIONS requests immediately
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
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
