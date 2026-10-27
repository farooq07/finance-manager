# FSWealth Axis — Finance Manager

## Stack

**Frontend:** React 19 + Vite + Tailwind CSS + TanStack Query v5 + React Router v6 + ECharts
**Backend:** Express 5 + Prisma ORM + Supabase PostgreSQL (+ pgvector)
**Auth:** JWT (7d, versioned — see `backend/src/utils/session.js`) + OTP via email + optional 6-digit app PIN (shared by web and mobile)
**AI:** Gemini 2.5 Flash (categoriser + RAG) + Groq gpt-oss-120b (fallback; llama-3.3-70b was retired)

## Dev Commands

```bash
# Frontend
cd frontend && npm run dev          # http://localhost:5173

# Backend
cd backend && npm run dev           # http://localhost:5000

# Tests
cd frontend && npm run test         # Vitest unit tests
cd frontend && npm run test:e2e     # Playwright E2E (needs both servers)
```

## Database Rules

- **NEVER** run `prisma db push` without verifying schema drift first (`/prisma-check`)
- Migrations: edit `schema.prisma` + add a migration in `prisma/migrations/` → commit → Railway redeploys and the Dockerfile runs `prisma migrate deploy` (never `db push`)
- Use `DIRECT_URL` for migrations, `DATABASE_URL` (pooled) for queries
- New migrations: make data-changing ones idempotent where possible. CI (`.github/workflows/ci.yml`) applies the whole history to an empty pgvector Postgres and fails on any difference from `schema.prisma`
- `0_init_catchup` and `20261027170000_db_push_drift` recreate what production once got from `db push`; both are no-ops on production
- `menu_visibility` table controls which sidebar items are visible — **always update it** when adding new routes

## Currency & Formatting

- All amounts are **PKR** (Pakistani Rupees)
- Use `fmtPKR()` from `frontend/src/utils/currency.js` — never hardcode "PKR" strings
- Dates: use `fmtDateLong()` from `frontend/src/utils/dates.js`

## Security Rules

- `user_id` **always** comes from `req.user.id` (JWT) — never from request body, query params, or AI output
- Auth errors carry a `code` (`backend/src/utils/session.js` → `AUTH_CODES`). Clients sign out **only** on 401 `SESSION_*`; 403 / `WRONG_PIN` / `VALIDATION` are refused actions on a valid session
- Spending/income: always via `services/moneyFlow.service.js`; net worth / Zakat: always via `services/wealth.service.js` — never re-sum tables in a controller
- Secrets (API keys, tokens): encrypt with `encryptSecret()` in `backend/src/utils/crypto.js`
- Never use `$queryRaw` or `$executeRaw` with string interpolation — parameterised only

## Frontend Conventions

- Dark mode: always add `dark:` Tailwind variants alongside light-mode classes
- Custom modals are `<div>` overlays, **not** `<dialog>` elements — don't use `role="dialog"` selectors in tests
- Sidebar menu items: add to `menu_visibility` DB table + `Sidebar.jsx` + `App.jsx` route

## Deployment

- **Frontend** → Vercel (auto-deploys on push to `main`). `VITE_` env vars are baked at build time — must be set in Vercel dashboard before deploying.
- **Backend** → Railway (auto-deploys on push to `main`). Set `FRONTEND_URL` for CORS.
- Railway public URL: `https://finance-manager-production-73ad.up.railway.app`

## Key File Locations

| What | Where |
|---|---|
| Auth controller | `backend/src/controllers/auth.controller.js` |
| Prisma schema | `backend/prisma/schema.prisma` |
| API client | `frontend/src/services/api.js` |
| Currency util | `frontend/src/utils/currency.js` |
| Date util | `frontend/src/utils/dates.js` |
| Sidebar menu | `frontend/src/components/Sidebar.jsx` |
| App routes | `frontend/src/App.jsx` |
| E2E fixtures | `frontend/e2e/fixtures/auth.js` |
| E2E test token | `frontend/.env.test` |
| Crypto util | `backend/src/utils/crypto.js` |
