# FSWealth Axis

A personal finance manager built for the Pakistani market — tracks spending, bank statements, investments, gold, dues, rent, and more, with an AI assistant that can answer questions about your own data.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, TanStack Query v5, React Router v6, ECharts |
| Backend | Express 5, Prisma ORM, Node.js |
| Database | Supabase PostgreSQL (pgvector for RAG embeddings) |
| Auth | JWT (7-day), OTP via email, optional 4-digit app PIN, Google OAuth, Apple OAuth |
| AI | Gemini 1.5 Flash (categoriser + RAG) · Groq llama-3.3-70b (fallback) |
| Secrets | Doppler (local dev) · Railway env vars (backend) · Vercel env vars (frontend) |
| Deploy | Frontend → Vercel · Backend → Railway |

---

## Modules

### Dashboard
Net worth hero with cash (bank + wallet), invested (stocks + funds), and a liabilities tile that breaks out **Receivable** (owed to you) vs **Payable** (what you owe). Includes daily history chart, asset-allocation donut, and composition breakdown. Clicking any tile deep-links to that module. All amounts respect the app PIN mask.

### Spending
Aggregated analytics across bank statement transactions, wallet transactions, and manual expense entries. Period filter (Month / Quarter / Year) with a back/forward navigator. Charts: day-by-day trend, category breakdown, top destinations, weekday rhythm. All data respects the selected date range.

### Accounts
Bank accounts and e-wallets in one screen. Upload monthly PDF statements; transactions are parsed and AI-categorised. Beneficiaries (saved payees) are a sub-tab with full transaction history per person.

### Ledger
Unified dues and debts screen with two tabs:
- **Dues** — interpersonal money (who owes you, who you owe)
- **Debts** — institutional debt (credit cards, loans, mortgages) with outstanding balance and payment history

### Stocks
PSX portfolio tracking. Upload CDC/broker snapshots, log buy transactions, track dividends, and view live PSX prices from the daily scraper.

### Personal
Three sub-tabs in one screen:
- **Zakat** — annual payment log
- **Rent** — monthly rental income with payer and account source
- **Assets** — property, vehicles, and other physical assets

### Gold Vault
PIN-locked gold jewellery inventory. Features:
- Add items by weight (grams) and carat; purchase price entered in **PKR/tola** with per-gram auto-calculated inline
- Photo upload per item (compressed client-side before storage)
- Daily price scraper keeps market rates current (hamariweb source)
- Today's value vs purchase value with P&L and % gain per item
- Portfolio-wide stats: Today's Value · Purchase Value · Gain/Loss · Total Weight
- Zakat eligibility check against the 85 g (24K-equivalent) nisab threshold

### AI Assistant
Chat interface backed by Gemini/Groq with full session history. Upload documents (PDF, CSV, text) for RAG-powered Q&A against your own financial data using pgvector embeddings.

### Settings
Profile, password, app PIN, Gold Vault PIN management, recurring payments / subscriptions, menu visibility controls per role, legal acceptance log.

---

## Local Development

### Prerequisites
- Node.js 20+
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) authenticated to the `fs-wealth-axis` project (`doppler login`)

### Install

```bash
cd frontend && npm install
cd ../backend  && npm install
```

### Run

```bash
# Backend — port 5000 (Doppler injects all secrets)
cd backend && npm run dev

# Frontend — port 5173 (separate terminal)
cd frontend && npm run dev
```

### Tests

```bash
# Unit tests (Vitest)
cd frontend && npm run test

# E2E tests (Playwright) — requires both servers running
cd frontend && npm run test:e2e
```

---

## Secrets

All local secrets live in **Doppler** (project `fs-wealth-axis`, config `dev`). Never create `.env` files.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Supabase URL — used by Prisma for all queries |
| `DIRECT_URL` | Direct Supabase URL — used by Prisma for migrations only |
| `JWT_SECRET` | Must be identical across all environments |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | OTP + email sender |
| `GEMINI_API_KEY` | AI categoriser and RAG engine |
| `GROQ_API_KEY` | Fallback AI provider |
| `AI_PROVIDER` / `AI_CHAT_PROVIDER` | `gemini` or `groq` |
| `FRONTEND_URL` | Allowed CORS origin |
| `GOOGLE_CLIENT_ID` | Google OAuth — leave unset to hide the Google sign-in button |
| `APPLE_CLIENT_ID` / `APPLE_REDIRECT_URI` | Apple OAuth — optional |

Railway and Vercel use their own dashboard env vars and do **not** use Doppler.

---

## Database

```bash
# Always check for drift before touching the schema
# (use the /prisma-check skill in Claude Code)

# Apply pending migrations locally
cd backend && npx prisma migrate deploy

# On push to main, Railway auto-runs prisma migrate deploy
```

> **Never** run `prisma db push` without checking drift first — it can overwrite migrations.

The `menu_visibility` table controls which sidebar items each role can see. Every new route needs a corresponding `INSERT` into that table.

---

## Project Structure

```
Finance-manager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # All Prisma models
│   │   └── migrations/            # SQL migration history
│   ├── src/
│   │   ├── controllers/           # Route handlers (one file per domain)
│   │   ├── routes/                # Express routers
│   │   ├── services/              # Cron jobs, gold scraper, AI/RAG
│   │   └── utils/                 # Prisma client, AES crypto, logger
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/            # Layout, Sidebar, Header, shared UI
    │   ├── context/               # AuthContext
    │   ├── hooks/                 # TanStack Query hooks (one file per domain)
    │   ├── pages/                 # Route-level page components
    │   ├── services/              # Axios API client (api.js)
    │   └── utils/
    │       ├── currency.js        # fmtPKR() — always use this for PKR amounts
    │       └── dates.js           # fmtDateLong()
    └── e2e/                       # Playwright E2E tests
```

---

## Currency & Formatting

All amounts are **PKR (Pakistani Rupees)**.

- Monetary values → `fmtPKR()` from `frontend/src/utils/currency.js`
- Dates → `fmtDateLong()` from `frontend/src/utils/dates.js`
- Gold prices → user-facing in **PKR/tola** (1 tola = 11.664 g); stored internally as PKR/gram

---

## UI Conventions

- **Confirmation dialogs** — never use the native `window.confirm` / `alert`. Use the shared shadcn-based dialog via the `useConfirm()` hook from `frontend/src/components/ui/confirm-dialog`. It returns a `Promise<boolean>` (`const ok = await confirm({ title, description, confirmText })`) and is mounted app-wide through `ConfirmDialogProvider` in `App.jsx`. Defaults to a destructive (red) confirm button.
- **Toasts** — use `sonner` (`toast.success` / `toast.error`); the `<Toaster>` is mounted in `App.jsx`.
- **Dark mode** — every component pairs light classes with `dark:` variants.
- Shared shadcn primitives live in `frontend/src/components/ui/` (button, dialog, confirm-dialog, table, etc.).

---

## Security

- `user_id` always comes from `req.user.id` (JWT middleware) — never from request body, params, or AI output
- DB-stored secrets (API keys, tokens) are encrypted with AES-256-GCM via `encryptSecret()` in `backend/src/utils/crypto.js`
- No raw SQL string interpolation — parameterised Prisma tagged templates only
- Rate limiting applied to all auth (`/api/auth/*`) and AI (`/api/chat/*/message`) endpoints

---

## Deployment

| Service | Platform | Deploy trigger |
|---|---|---|
| Frontend | Vercel | Push to `main` |
| Backend | Railway | Push to `main` (also auto-runs `prisma migrate deploy`) |

Backend URL: `https://finance-manager-production-73ad.up.railway.app`

`VITE_` env vars are baked in at Vercel build time — set them in the Vercel dashboard before deploying.
