# Guía de Deploy — FinTrack Panama en línea

Esta guía explica cómo publicar la app gratis en internet en ~20 minutos,
para que cualquiera pueda usarla desde el navegador e instalarla en su móvil.

---

## Resumen de servicios (todos gratuitos)

| Servicio | Qué aloja | Plan gratuito |
|----------|-----------|---------------|
| **Vercel** | Frontend (Next.js) | Ilimitado en hobby |
| **Render** | Backend (Express API) | 750h/mes |
| **Supabase** | Base de datos PostgreSQL | 500 MB |

---

## Paso 1 — Base de datos en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. Elige nombre: `fintrack-panama`, región: `US East`
3. Ve a **Settings → Database → Connection string → URI**
4. Copia la URL (la necesitarás en el paso 2)
5. En el **SQL Editor** de Supabase, no necesitas hacer nada más — Render ejecutará las migraciones automáticamente

---

## Paso 2 — Backend en Render

1. Ir a [render.com](https://render.com) → **New → Blueprint**
2. Conecta tu repositorio `Gu-max1/mi-app-registro`
3. Render detectará el archivo `fintrack-panama/render.yaml` automáticamente
4. En las variables de entorno, completa manualmente:
   - `DATABASE_URL` → URL de Supabase del paso 1
   - `FRONTEND_URL` → déjalo vacío por ahora (lo actualizarás después)
5. Haz clic en **Apply** → Render desplegará el backend
6. Cuando termine, copia la URL del servicio (ej: `https://fintrack-panama-api.onrender.com`)

---

## Paso 3 — Frontend en Vercel

1. Ir a [vercel.com](https://vercel.com) → **New Project**
2. Importa el repositorio `Gu-max1/mi-app-registro`
3. En **Root Directory**, escribe: `fintrack-panama/frontend`
4. En **Environment Variables**, agrega:
   ```
   NEXT_PUBLIC_API_URL = https://fintrack-panama-api.onrender.com/api/v1
   ```
   (usa la URL del paso 2)
5. Haz clic en **Deploy**
6. Cuando termine, copia la URL (ej: `https://fintrack-panama.vercel.app`)

---

## Paso 4 — Conectar frontend ↔ backend

1. En Render, ve al servicio `fintrack-panama-api`
2. **Environment → Edit** la variable `FRONTEND_URL`
3. Pon la URL de Vercel: `https://fintrack-panama.vercel.app`
4. Guarda y Render redesplegará automáticamente

---

## Paso 5 — Cargar datos demo (opcional)

En tu terminal local:

```bash
cd fintrack-panama/backend
DATABASE_URL="tu-url-de-supabase" npx prisma db push
DATABASE_URL="tu-url-de-supabase" npm run prisma:seed
```

Credenciales demo:
- Email: `demo@fintrackpanama.com`
- Password: `Demo1234!`

---

## Paso 6 — Instalar la app en móvil (PWA)

### Android (Chrome)
1. Abre la URL de Vercel en Chrome
2. Aparecerá un banner "Instalar app" en la parte inferior
3. Toca **Instalar** → la app aparece en tu pantalla de inicio

### iPhone (Safari)
1. Abre la URL en Safari
2. Toca el botón **Compartir** (cuadrado con flecha)
3. Toca **"Agregar a pantalla de inicio"**
4. La app se instala como una app nativa

---

## Deploy automático (CI/CD)

Cada vez que hagas `git push` a `main`, GitHub Actions:
1. Ejecuta los tests del backend
2. Verifica los tipos de TypeScript del frontend
3. Si todo pasa, despliega automáticamente a Vercel y Render

Para activarlo, agrega estos secrets en GitHub:
- **Settings → Secrets → Actions**:
  - `VERCEL_TOKEN` → desde vercel.com/account/tokens
  - `VERCEL_ORG_ID` → desde `.vercel/project.json` tras primer deploy
  - `VERCEL_PROJECT_ID` → idem
  - `RENDER_DEPLOY_HOOK_URL` → desde Render → Settings → Deploy Hook

---

## URLs finales esperadas

```
Frontend:  https://fintrack-panama.vercel.app
Backend:   https://fintrack-panama-api.onrender.com
API docs:  https://fintrack-panama-api.onrender.com/health
```
