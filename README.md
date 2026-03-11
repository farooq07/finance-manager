# Personal Finance & Investment Manager

A full-stack web application to track expenses, mutual fund portfolios, stock investments, dues ledgers, and rental income — with date-wise portfolio snapshots, data visualization, and industry-standard best practices.

---

## Features

### 📊 Mutual Funds
- Upload **CSV / Excel (.xlsx / .xls)** portfolio statements (auto-detects Meezan Fund format)
- Date-wise **portfolio snapshots** — compare value, gain/loss, and return % across uploads
- **ECharts** visualizations: bar chart (value vs invested), donut chart (allocation), timeline chart
- Bulk select & delete with checkboxes
- Per-fund gain/loss in PKR and percentage

### 💰 Expenses Tracker
- Add, edit, and delete expenses by category
- Payment method tracking

### 🏠 Rent Tracker
- Monthly rent entries with payer, amount, and account source
- Dropdown selects for predefined payers and bank accounts

### 📒 Dues Ledger
- Per-person transaction tracking (receivable / payable)
- CSV upload for bulk transactions
- Inline editing, bulk type toggle, net balance calculation

### 📈 Stocks
- Stock portfolio with buy transactions
- Brokerage fee tracking
- **Live PSX Data Sync** via Playwright scraper

### 🕋 Zakat & Assets
- Calculate Zakat automatically
- Manage physical assets like property and gold

### 🔐 Advanced Authentication
- Secure JWT-based registration and login
- OTP email verification step
- Secure "Forgot Password" flow with OTP
- Master PIN generation for masking sensitive portfolio values

### 📋 Dashboard & Reports
- Portfolio summary cards
- Monthly/category expense reports

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 (Vite) + Tailwind CSS + Lucide Icons |
| **Charts** | ECharts via `echarts-for-react` |
| **State Management** | TanStack Query (React Query) for server state caching |
| **Form Validation** | Zod schemas (frontend + backend) |
| **Safe Math** | `currency.js` for financial calculations |
| **Date Utils** | `date-fns` |
| **Backend** | Node.js + Express 5 |
| **Database** | PostgreSQL (Supabase) + Prisma ORM |
| **Auth** | JWT + bcrypt |
| **Testing** | Vitest + React Testing Library (45 tests) |

---

## Project Structure

```
finance-manager/
├── backend/
│   ├── prisma/schema.prisma          # Database models
│   ├── src/
│   │   ├── controllers/              # Route handlers
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js     # JWT verification
│   │   │   └── validate.js           # Zod validation middleware
│   │   ├── routes/                    # Express routes
│   │   └── utils/prisma.js           # Prisma client
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/               # Layout, Sidebar, Header
│   │   ├── context/AuthContext.jsx    # Auth state
│   │   ├── hooks/useMutualFunds.js   # TanStack Query hooks
│   │   ├── pages/                    # All page components
│   │   ├── providers/QueryProvider.jsx
│   │   ├── services/api.js           # Axios instance
│   │   └── utils/
│   │       ├── currency.js           # Safe math & PKR formatting
│   │       ├── dates.js              # Date formatting
│   │       ├── schemas.js            # Zod validation schemas
│   │       └── __tests__/            # Unit tests
│   └── vitest.config.js
```

---

## Running Locally

### 1. Database Setup
Create a [Supabase](https://supabase.com) project for a free PostgreSQL database. Get the pooler URL and direct URL from the connection settings.

### 2. Backend
```bash
cd backend
npm install
```

Create a `.env` file:
```env
DATABASE_URL=your_supabase_pooler_url
DIRECT_URL=your_supabase_direct_url
JWT_SECRET=your_random_secret_string
```

```bash
npx prisma db push
node server.js
```

### 3. Frontend
```bash
cd frontend
npm install
```

Create a `.env.local` file:
```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

### 4. Run Tests
```bash
cd frontend
npm test              # Run all 45 tests
npm run test:watch    # Watch mode
```

---

## Best Practices Implemented

- **Safe Math** — `currency.js` prevents floating point errors (`0.1 + 0.2 = 0.3`, not `0.30000...04`)
- **Zod Validation** — Schema validation on both frontend forms and backend API routes
- **TanStack Query** — Server state caching with auto-refetch and background sync
- **Centralized Utilities** — Single source of truth for PKR formatting, date formatting, gain/loss helpers
- **Unit Testing** — 45 Vitest tests covering financial math, validation schemas, and date utilities
- **Backend Validation Middleware** — Rejects invalid data before it reaches the database

---

## Currency

All values are displayed in **PKR (Pakistani Rupee)**.

---

*Built with ❤️ as a premium Personal Finance Dashboard.*
