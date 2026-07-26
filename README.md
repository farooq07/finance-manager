# FSWealth Axis

A personal finance manager built for the Pakistani market — tracks spending, bank statements, investments, gold, dues, rent, and more, with an AI assistant that can answer questions about your own data.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, TanStack Query v5, React Router v6, ECharts |
| UI kit | shadcn-based primitives in `components/ui/`, documented in Storybook |
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
Four sub-tabs in one screen (each tab can be hidden per role via menu visibility):
- **Zakat** — annual payment log
- **Rent** — monthly rental income with payer and account source
- **Assets** — property, vehicles, and other physical assets
- **Gold** — the Gold Vault, described below

### Gold Vault — `/personal?tab=gold`
PIN-locked gold jewellery inventory, behind its own PIN separate from the app PIN. Features:
- Add items by weight (grams) and carat; purchase price entered in **PKR/tola** with per-gram auto-calculated inline
- Photo upload per item (compressed client-side before storage)
- Daily price scraper keeps market rates current (hamariweb source)
- Today's value vs purchase value with P&L and % gain per item
- Portfolio-wide stats: Today's Value · Purchase Value · Gain/Loss · Total Weight
- Zakat eligibility check against the 85 g (24K-equivalent) nisab threshold

### AI Assistant
Chat interface backed by Gemini/Groq with full session history. Upload documents (PDF, CSV, text) for RAG-powered Q&A against your own financial data using pgvector embeddings.

### Reports
Transaction log filtered by period, exportable to CSV or PDF. The backend also exposes raw exports at `/api/export/*` (transactions, expenses, dues as CSV; a full account dump as JSON).

### Help & Feedback
Help content plus a feedback form (bug / feature / question). Submissions land in an admin queue where they can be moved to in-progress or resolved.

### Settings
Profile, password, app PIN, Gold Vault PIN management, recurring payments / subscriptions, users and roles, menu visibility controls per role, legal acceptance log.

---

## Background Jobs

Registered on backend start by `services/cron.service.js`:

| Job | Schedule | What it does |
|---|---|---|
| Weekly summary email | Sun 09:00 | Emails each user their dashboard metrics |
| FX rate fetch | Daily 06:00 | Stores PKR rates for USD, EUR, GBP, AED, SAR |
| Bill reminders | Daily 08:00 | Emails reminders for recurring payments coming due |
| Gold price sync | Daily 10:00 | Scrapes the 24K price per tola and per gram |
| PSX price sync | Weekdays 16:30 PKT | Scrapes closing prices and appends a daily price-history row |
| PSX portfolio snapshot | Weekdays 17:00 PKT | Re-values holdings at the close so the performance chart accrues history |
| Net-worth snapshot | Daily 23:55 | Writes one net-worth history row per user |

The two PSX jobs skip weekends and the market holidays listed in `backend/src/utils/dates.js`.

---

## Local Development

### Prerequisites
- Node.js 20+
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) authenticated to the `fs-wealth-axis` project (`doppler login`)

On a fresh clone, bind the backend folder to its Doppler config once — `backend/doppler.yaml` supplies the project and config, so no flags are needed:

```bash
cd backend && doppler setup --no-interactive
```

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

### Storybook

```bash
# Component workshop for the shared UI kit — port 6006
cd frontend && npm run storybook
```

### Tests

```bash
# Frontend unit tests (Vitest)
cd frontend && npm run test

# Backend unit tests (Jest)
cd backend && npm run test

# E2E tests (Playwright) — requires both servers running
cd frontend && npm run test:e2e
```

---

## Secrets

All local secrets live in **Doppler** (project `fs-wealth-axis`, branch config `dev_farooq` off `dev` — see `backend/doppler.yaml`). Never create `.env` files.

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
│   │   ├── services/              # Cron jobs, scrapers, parsers, AI/RAG
│   │   ├── middleware/            # verifyToken, request validation
│   │   └── utils/                 # Prisma client, AES crypto, email, logger
│   ├── doppler.yaml               # Doppler project/config binding
│   └── server.js
├── frontend/
│   ├── .storybook/                # Storybook config
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # shadcn primitives + .stories.jsx files
│   │   │   ├── admin/             # User and role table rows
│   │   │   └── auth/              # Social sign-in buttons
│   │   ├── context/               # AuthContext, PinContext
│   │   ├── hooks/                 # TanStack Query hooks (one file per domain)
│   │   ├── pages/                 # Route-level page components
│   │   ├── services/              # Axios API client (api.js)
│   │   └── utils/
│   │       ├── currency.js        # fmtPKR() — always use this for PKR amounts
│   │       └── dates.js           # fmtDateLong()
│   └── e2e/                       # Playwright E2E tests
└── docs/
    ├── setup/DOCS.md              # Full API, model, page, and hook reference
    ├── deployment/                # Railway and hosting guides
    └── mobile/                    # React Native / Expo notes
```

Full API endpoint tables, database models, page routes, and hook reference: [docs/setup/DOCS.md](docs/setup/DOCS.md).

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
