# FinTrack Panama

> Aplicación de finanzas personales para trabajadores panameños con ingresos quincenales.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)

## Descripción

FinTrack Panama te permite:

- **Registrar ingresos quincenales** con cálculo automático de deducciones panameñas (CSS 9.75%, Seguro Educativo 1.25%, IFARHU opcional)
- **Gestionar gastos** por categoría con balance en tiempo real
- **Controlar deudas** con tablas de amortización y comparación Bola de Nieve vs Avalancha
- **Crear metas de ahorro** con cálculo de cuota quincenal necesaria
- **Analizar tu salud financiera** con alertas, recomendaciones y score 0-100

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Estado | Zustand, React Hook Form, Zod |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma + PostgreSQL |
| Auth | JWT (access 15min + refresh 7d) + bcrypt |
| DevOps | Docker Compose |

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                   Cliente (Next.js 14)                   │
│  App Router · Zustand · React Hook Form · Recharts       │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS + Bearer JWT
┌──────────────────────▼──────────────────────────────────┐
│              Backend (Express + TypeScript)              │
│  Auth · Income · Expenses · Debts · Savings · Analytics  │
│  Helmet · CORS · Rate Limiting · Zod Validation          │
└──────────────────────┬──────────────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼──────────────────────────────────┐
│                  PostgreSQL Database                      │
│  Users · IncomeRecords · Expenses · Debts · Savings      │
└─────────────────────────────────────────────────────────┘
```

## Requisitos Previos

- Node.js >= 20
- npm >= 9
- Docker + Docker Compose (para PostgreSQL local)
- Git

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/gu-max1/mi-app-registro.git
cd mi-app-registro/fintrack-panama
```

### 2. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Edita backend/.env con tus valores

# Frontend
cp frontend/.env.example frontend/.env.local
# Edita con NEXT_PUBLIC_API_URL
```

### 3. Levantar PostgreSQL con Docker

```bash
docker-compose up -d postgres
```

### 4. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 5. Ejecutar migraciones y seed

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

### 6. Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

### 7. Iniciar en desarrollo

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Abre http://localhost:3000

**Credenciales demo:** `demo@fintrackpanama.com` / `Demo1234!`

## Variables de Entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/fintrack` |
| `JWT_ACCESS_SECRET` | Secreto para access tokens (min 32 chars) | `super-secret-key-...` |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens (min 32 chars) | `another-secret-...` |
| `JWT_ACCESS_EXPIRES_IN` | Expiración access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiración refresh token | `7d` |
| `PORT` | Puerto del servidor | `4000` |
| `NODE_ENV` | Entorno | `development` |
| `FRONTEND_URL` | URL del frontend para CORS | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Ventana rate limiting (ms) | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Máximo requests por ventana | `100` |

### Frontend (`frontend/.env.local`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend | `http://localhost:4000/api/v1` |

## API Endpoints

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Registro de usuario |
| POST | `/api/v1/auth/login` | Inicio de sesión |
| POST | `/api/v1/auth/refresh` | Renovar tokens |
| POST | `/api/v1/auth/logout` | Cerrar sesión |
| GET | `/api/v1/auth/me` | Perfil del usuario |

### Income (requiere autenticación)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/income` | Listar quincenas |
| POST | `/api/v1/income` | Crear quincena |
| PATCH | `/api/v1/income/:id` | Actualizar |
| DELETE | `/api/v1/income/:id` | Eliminar |

### Expenses, Debts, Savings
Todos con CRUD completo en `/api/v1/expenses`, `/api/v1/debts`, `/api/v1/savings`.

### Analytics
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/analytics/dashboard` | Dashboard completo |
| GET | `/api/v1/debts/strategies` | Estrategias Bola de Nieve / Avalancha |

## Tests

```bash
cd backend
npm test                 # Ejecutar todos los tests
npm run test:coverage    # Con reporte de cobertura
```

Los tests cubren:
- Calculadora de deducciones panameñas (CSS, Educativo, IFARHU)
- Tabla de amortización
- Score financiero
- Motor de alertas y recomendaciones
- Estrategias de deuda (Snowball vs Avalanche)

## Deploy en Producción

### Frontend → Vercel

1. Conecta tu repositorio en [vercel.com](https://vercel.com)
2. Root directory: `fintrack-panama/frontend`
3. Variables de entorno: `NEXT_PUBLIC_API_URL=https://tu-backend.render.com/api/v1`

### Backend → Render

1. Nuevo "Web Service" en [render.com](https://render.com)
2. Root directory: `fintrack-panama/backend`
3. Build command: `npm install && npm run prisma:generate && npm run build`
4. Start command: `npm start`
5. Variables de entorno: todas las del `.env.example`

### Base de datos → Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a Settings → Database → Connection String
3. Usa la URL como `DATABASE_URL`
4. Ejecuta: `npx prisma migrate deploy`

## Estructura del Proyecto

```
fintrack-panama/
├── backend/
│   ├── src/
│   │   ├── modules/          # auth, income, expenses, debts, savings, analytics
│   │   │   └── [module]/
│   │   │       ├── [module].controller.ts
│   │   │       ├── [module].service.ts
│   │   │       ├── [module].routes.ts
│   │   │       └── [module].schema.ts
│   │   ├── middleware/       # errorHandler, rateLimiter, authenticate
│   │   ├── utils/            # jwt, financialCalculator, analyticsEngine
│   │   ├── config/           # env validation, constants
│   │   └── app.ts / server.ts
│   ├── tests/
│   │   └── unit/             # financialCalculator, analyticsEngine
│   ├── prisma/               # schema.prisma + seed.ts
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/           # login, register
│   │   ├── (dashboard)/      # dashboard, income, expenses, debts, savings
│   │   └── layout.tsx
│   ├── store/                # authStore, dashboardStore (Zustand)
│   ├── lib/                  # api.ts (axios + interceptors), formatters.ts
│   ├── types/                # TypeScript interfaces
│   └── .env.example
│
├── docker-compose.yml
└── README.md
```

## Características de Seguridad

- Contraseñas hasheadas con **bcrypt** (12 salt rounds)
- **JWT rotation**: access token 15min + refresh token 7 días con rotación automática
- **Helmet.js**: headers de seguridad (CSP, HSTS, XSS Protection)
- **Rate limiting**: 100 req/15min global, 10 req/15min en auth
- **Zod validation**: validación estricta en servidor y cliente
- **CORS** configurado para origen específico
- **SQL injection**: prevenida por Prisma ORM (queries parametrizadas)

## Contribución

1. Haz fork del repositorio
2. Crea tu rama: `git checkout -b feature/mi-feature`
3. Commit: `git commit -m "feat: descripción clara"`
4. Push: `git push origin feature/mi-feature`
5. Abre un Pull Request

## Licencia

MIT © 2024 FinTrack Panama
