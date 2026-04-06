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

app.use(
  cors({
    origin: [env.FRONTEND_URL, `${env.FRONTEND_URL}/`],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200 // Importante para navegadores antiguos y algunos preflights
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
