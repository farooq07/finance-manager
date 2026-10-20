# FSWealth Axis — Finance Manager

## Stack

**Frontend:** React 19 + Vite + Tailwind CSS + TanStack Query v5 + React Router v6 + ECharts
**Backend:** Express 5 + Prisma ORM + Supabase PostgreSQL (+ pgvector)
**Auth:** JWT (7d) + OTP via email + optional 4-digit app PIN
**AI:** Gemini 2.5 Flash (categoriser + RAG) + Groq llama-3.3-70b (fallback)

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
- Migrations: edit `schema.prisma` → commit → Railway redeploys and auto-runs `prisma migrate deploy`
- Use `DIRECT_URL` for migrations, `DATABASE_URL` (pooled) for queries
- `menu_visibility` table controls which sidebar items are visible — **always update it** when adding new routes

## Currency & Formatting

- All amounts are **PKR** (Pakistani Rupees)
- Use `fmtPKR()` from `frontend/src/utils/currency.js` — never hardcode "PKR" strings
- Dates: use `fmtDateLong()` from `frontend/src/utils/dates.js`

## Security Rules

- `user_id` **always** comes from `req.user.id` (JWT) — never from request body, query params, or AI output
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
