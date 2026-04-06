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

// Build the list of allowed origins from environment variables
const allowedOrigins: (string | RegExp)[] = [];

// Add primary FRONTEND_URL(s) — supports comma-separated values
env.FRONTEND_URL.split(',').forEach((url) => {
  const trimmed = url.trim().replace(/\/$/, '');
  if (trimmed) allowedOrigins.push(trimmed);
});

// Add any extra origins from ALLOWED_ORIGINS (comma-separated)
if (env.ALLOWED_ORIGINS) {
  env.ALLOWED_ORIGINS.split(',').forEach((url) => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (trimmed) allowedOrigins.push(trimmed);
  });
}

// Always allow Vercel preview deployments for this project
allowedOrigins.push(/^https:\/\/app-finanzas.*\.vercel\.app$/);

// Always allow localhost in development
if (env.NODE_ENV !== 'production') {
  allowedOrigins.push(/^http:\/\/localhost:\d+$/);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some((pattern) =>
        typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
      );
      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200,
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
