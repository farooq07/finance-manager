# Finance Manager — Complete React Native Mobile App Development Prompt

> Hand this document to any developer or AI assistant. It contains everything needed to build the complete mobile app from scratch — no additional context required.

---

## 1. PROJECT OVERVIEW

**App Name:** Finance Manager
**Purpose:** A personal finance and investment tracking mobile app for Pakistani users.
**Currency:** PKR (Pakistani Rupee) — all amounts in PKR unless stated otherwise.
**Backend:** Already built. Node.js + Express + PostgreSQL (Supabase). You build the React Native frontend ONLY.
**Users:** Single-user per account. All data is private and scoped to the authenticated user.

### What the app tracks:
- Personal expenses (categories, payment methods)
- Mutual fund portfolio (CSV/XLSX upload, NAV tracking, gain/loss)
- Stock portfolio (PSX stocks, buy transactions, live price sync)
- Dues ledger (receivables and payables per person)
- Rental income entries
- Bank accounts and digital wallets
- Physical assets (property, gold, vehicles)
- Zakat payments
- Pakistan Stock Exchange (PSX) portfolio snapshots

---

## 2. TECH STACK (Required — do not substitute)

| Concern | Library |
|---|---|
| Framework | React Native with Expo SDK 52 (managed workflow) |
| Language | TypeScript (strict mode, no `any`) |
| Routing | Expo Router v3 (file-based) |
| Server state | TanStack Query v5 (React Query) |
| HTTP client | Axios |
| Client state | Zustand |
| Forms | React Hook Form + Zod |
| Animations | React Native Reanimated 3 |
| Gestures | React Native Gesture Handler |
| Charts | Victory Native XL (`victory-native`) |
| Token storage | Expo SecureStore (NEVER AsyncStorage for tokens) |
| File picker | Expo DocumentPicker |
| Safe math | currency.js (all PKR arithmetic — prevents float errors) |
| Dates | date-fns |
| Haptics | Expo Haptics |
| Notifications | Toast via react-native-toast-message |
| Icons | `@expo/vector-icons` (Ionicons) |

---

## 3. ENVIRONMENT VARIABLES

Create `.env` in project root:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api
```

> Use your machine's local network IP when testing on a real device. Use `http://localhost:5000/api` for simulators.

---

## 4. PROJECT STRUCTURE

```
finance-manager-mobile/
├── app/
│   ├── _layout.tsx                     ← Root layout, auth guard, QueryProvider
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── otp-verification.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   └── pin-setup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx                 ← Bottom tab navigator
│   │   ├── index.tsx                   ← Dashboard
│   │   ├── expenses.tsx
│   │   ├── portfolio/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx               ← Portfolio home (mutual funds + stocks)
│   │   │   ├── mutual-funds.tsx
│   │   │   ├── mutual-fund-snapshots.tsx
│   │   │   ├── stocks.tsx
│   │   │   └── psx-snapshots.tsx
│   │   ├── accounts.tsx                ← Banks + Wallets
│   │   └── more.tsx                    ← Dues, Rent, Zakat, Assets, Reports, Settings
│   ├── dues/
│   │   ├── index.tsx
│   │   └── [personId].tsx              ← Person ledger detail
│   ├── stocks/
│   │   └── [stockId].tsx               ← Stock detail + transactions
│   ├── banks/
│   │   └── [bankId].tsx                ← Bank detail
│   └── pin-entry.tsx                   ← Full-screen PIN entry modal
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── DatePicker.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Badge.tsx
│   │   ├── MaskedBalance.tsx           ← Shows PKR **** until PIN verified
│   │   ├── EmptyState.tsx
│   │   ├── SwipeableRow.tsx            ← Swipe-to-delete/edit
│   │   ├── FAB.tsx                     ← Floating action button
│   │   └── SectionHeader.tsx
│   ├── charts/
│   │   ├── BarChart.tsx
│   │   ├── DonutChart.tsx
│   │   └── LineChart.tsx
│   ├── forms/
│   │   ├── ExpenseForm.tsx
│   │   ├── RentForm.tsx
│   │   ├── MutualFundForm.tsx
│   │   ├── StockForm.tsx
│   │   ├── StockTransactionForm.tsx
│   │   ├── DuesPersonForm.tsx
│   │   ├── DuesTransactionForm.tsx
│   │   ├── BankForm.tsx
│   │   ├── WalletForm.tsx
│   │   ├── ZakatForm.tsx
│   │   ├── AssetForm.tsx
│   │   └── BrokerForm.tsx
│   └── layout/
│       ├── ScreenHeader.tsx
│       └── PinGate.tsx                 ← Wraps sensitive screens
├── hooks/
│   ├── useAuth.ts
│   ├── usePIN.ts
│   ├── useDashboard.ts
│   ├── useExpenses.ts
│   ├── useMutualFunds.ts
│   ├── useStocks.ts
│   ├── usePsx.ts
│   ├── useDues.ts
│   ├── useRent.ts
│   ├── useBanks.ts
│   ├── useWallets.ts
│   ├── useZakat.ts
│   ├── useAssets.ts
│   ├── useBrokers.ts
│   └── useInstitutions.ts
├── services/
│   └── api.ts                          ← Axios instance + JWT interceptor
├── stores/
│   ├── authStore.ts                    ← Zustand: user, token
│   ├── pinStore.ts                     ← Zustand: isPinVerified (session only)
│   └── themeStore.ts                   ← Zustand: dark/light mode
├── utils/
│   ├── currency.ts                     ← PKR safe math wrappers
│   ├── dates.ts                        ← date-fns helpers
│   └── schemas.ts                      ← All Zod validation schemas
├── constants/
│   ├── colors.ts                       ← Design token colors
│   ├── queryKeys.ts                    ← TanStack Query key constants
│   └── categories.ts                   ← Expense category list + icons
└── types/
    └── api.ts                          ← All TypeScript interfaces for API responses
```

---

## 5. TYPESCRIPT INTERFACES (types/api.ts)

Define these exact interfaces — they match the backend response shapes:

```typescript
// Auth
export interface User {
  id: string;
  name: string;
  email: string;
  hasPin: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginInitResponse {
  message: string;
  userId: string;
  email: string;
  requiresOtp: boolean;
}

// Dashboard
export interface DashboardMetrics {
  netWorth: number;
  totalBankBalance: number;
  totalWalletBalance: number;
  totalInvestments: number;
  mutualFundValue: number;
  mutualFundCost: number;
  stockValue: number;
  stockCost: number;
  totalReceivable: number;
  totalPayable: number;
  totalExpenses: number;
  currentMonthExpenses: number;
  totalAssetValue: number;
}

export interface MonthlyExpense { month: string; amount: number; }
export interface InvestmentDistribution { name: string; value: number; }

export interface DashboardResponse {
  metrics: DashboardMetrics;
  charts: {
    monthlyExpenses: MonthlyExpense[];
    investmentDistribution: InvestmentDistribution[];
    assetAllocation: InvestmentDistribution[];
  };
}

// Expenses
export interface Expense {
  id: string;
  user_id: string;
  amount: string; // Prisma Decimal comes as string
  category: string;
  expense_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

// Mutual Funds
export interface MutualFund {
  id: string;
  user_id: string;
  fund_name: string;
  fund_symbol: string;
  units: string;
  current_nav: string;
  current_value: string;
  invested_amount: string;
  gain_loss_fytd: string;
  gain_loss_since_inception: string;
  status: string;
  created_at: string;
}

export interface PortfolioSummary {
  totalInvestmentPKR: string;
  currentValuePKR: string;
  totalGainLossPKR: string;
}

export interface MutualFundsResponse {
  funds: MutualFund[];
  portfolioSummary: PortfolioSummary;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  upload_date: string;
  total_value: string;
  total_gain: string;
  total_invested: string;
  funds_data: any[];
}

// Stocks
export interface StockTransaction {
  id: string;
  user_id: string;
  stock_id: string;
  buy_date: string;
  buy_price: string;
  quantity: number;
  brokerage_fee: string;
  created_at: string;
}

export interface Stock {
  id: string;
  user_id: string;
  stock_symbol: string;
  company_name: string | null;
  current_market_price: string;
  created_at: string;
  transactions: StockTransaction[];
}

export interface PsxStock {
  id: string;
  ticker: string;
  companyName: string;
  price: number;
  change: number;
  changePct: number;
  volume: string;
  high: number;
  low: number;
  marketCap: number | null;
  lastUpdated: string;
}

// PSX Snapshots
export interface PsxHolding {
  symbol: string;
  holding: number;
  market_rate: number;
  custody_val: number;
  cost_per_unit?: number;
  total_cost?: number;
}

export interface PsxSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_custody: string;
  total_invested: string;
  holdings_data: PsxHolding[];
  summary_data: Record<string, any> | null;
  created_at: string;
}

// Dues
export interface DuesTransaction {
  id: string;
  user_id: string;
  person_id: string;
  transaction_type: 'receivable' | 'payable';
  amount: string;
  transaction_date: string;
  description: string | null;
  created_at: string;
}

export interface DuesPerson {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  created_at: string;
  transactions: DuesTransaction[];
  netBalance: number;
}

// Rent
export interface RentEntry {
  id: string;
  user_id: string;
  month: string;
  year: number;
  payer_name: string;
  amount: string;
  payment_date: string;
  account_source: string;
  notes: string | null;
  created_at: string;
}

export interface RentResponse {
  entries: RentEntry[];
  totalReceived: number;
  byYear: Record<string, RentEntry[]>;
}

// Banks
export interface Bank {
  id: string;
  user_id: string;
  name: string;
  account_no: string;
  iban_no: string;
  currency: string;
  exchange_rate: string;
  starting_balance: string;
  current_balance: string;
  created_at: string;
}

export interface BankStatement {
  id: string;
  bank_id: string;
  month: string;
  year: number;
  file_path: string | null;
  upload_date: string;
  transactions: any;
  closing_balance: string | null;
}

export interface BankDetail extends Bank {
  statements: BankStatement[];
}

// Wallets
export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  institution: string;
  balance: string;
  currency: string;
  exchange_rate: string;
  color_theme: string;
  account_num: string | null;
  created_at: string;
}

// Zakat
export interface ZakatEntry {
  id: string;
  user_id: string;
  amount: string;
  description: string | null;
  date: string;
  created_at: string;
}

export interface ZakatResponse {
  entries: ZakatEntry[];
  currentYearTotal: number;
}

// Assets
export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: string;
  value: string;
  purchase_date: string | null;
  description: string | null;
  created_at: string;
}

export interface AssetsResponse {
  assets: Asset[];
  totalValue: number;
}

// Broker
export interface BrokerAccount {
  id: string;
  user_id: string;
  account_title: string;
  client_code: string;
  participant_acc_no: string | null;
  cdc_sub_acc_no: string | null;
  stock_pin_code: string | null;
  created_at: string;
}

// Institutions
export interface Institution {
  id: string;
  user_id: string;
  name: string;
  type: 'bank' | 'wallet' | 'cash' | 'other';
  color: string;
  created_at: string;
}

// Bank Investments
export interface BankInvestment {
  id: string;
  user_id: string;
  transaction_date: string;
  amount: string;
  description: string | null;
  created_at: string;
}

export interface BankInvestmentsResponse {
  investments: BankInvestment[];
  total_invested: number;
}
```

---

## 6. AXIOS SERVICE (services/api.ts)

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token');
      useAuthStore.getState().clearAuth();
      // Navigate to login — handled by root _layout auth guard
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper to extract error message from any API error
export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'Something went wrong';
  }
  return 'Something went wrong';
}
```

---

## 7. ZUSTAND STORES

### stores/authStore.ts
```typescript
import { create } from 'zustand';
import { User } from '../types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setAuth: (user) => set({ user, isAuthenticated: true }),
  clearAuth: () => set({ user: null, isAuthenticated: false }),
}));
```

### stores/pinStore.ts
```typescript
import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';

interface PinState {
  isPinVerified: boolean;
  setPinVerified: (val: boolean) => void;
}

export const usePinStore = create<PinState>((set) => ({
  isPinVerified: false,
  setPinVerified: (val) => set({ isPinVerified: val }),
}));

// Reset PIN when app goes to background
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'background' || state === 'inactive') {
    usePinStore.getState().setPinVerified(false);
  }
});
```

---

## 8. CURRENCY UTILITIES (utils/currency.ts)

```typescript
import currency from 'currency.js';

// Wrap a value for safe arithmetic
export const money = (value: number | string) =>
  currency(value, { precision: 2 });

// Format as "PKR 1,23,456" (Pakistani lakh format)
export const fmtPKR = (value: number | string): string => {
  const num = parseFloat(String(value));
  if (isNaN(num)) return 'PKR 0';
  return 'PKR ' + Math.round(num).toLocaleString('en-PK');
};

// Format with decimals: "PKR 1,234.50"
export const fmtPKRDecimal = (value: number | string, decimals = 2): string => {
  const num = parseFloat(String(value));
  if (isNaN(num)) return 'PKR 0.00';
  return 'PKR ' + num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Calculate % change
export const pctChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

// Safe addition of multiple values
export const safeSum = (values: (number | string)[]): number =>
  values.reduce((acc, v) => money(acc).add(v).value, 0);

// Gain/loss text color
export const glColor = (value: number | string): string => {
  const n = parseFloat(String(value));
  return n >= 0 ? '#10B981' : '#EF4444'; // emerald-500 / red-500
};

// Format gain/loss with sign
export const fmtGL = (value: number | string): string => {
  const n = parseFloat(String(value));
  const sign = n >= 0 ? '+' : '';
  return sign + fmtPKR(n);
};
```

---

## 9. ZOD SCHEMAS (utils/schemas.ts)

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const pinSchema = z.object({
  pin: z.string().min(4, 'PIN must be at least 4 digits'),
});

export const expenseSchema = z.object({
  amount: z.number({ invalid_type_error: 'Amount is required' }).positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  expense_date: z.string().min(1, 'Date is required'),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

export const mutualFundSchema = z.object({
  fund_name: z.string().min(1, 'Fund name is required'),
  fund_symbol: z.string().min(1).max(20),
  units: z.number().min(0),
  current_nav: z.number().positive(),
  invested_amount: z.number().positive(),
});

export const rentSchema = z.object({
  month: z.string().min(1, 'Month is required'),
  year: z.number().int().min(2000).max(2100),
  payer_name: z.string().min(1, 'Payer name is required'),
  amount: z.number().positive(),
  payment_date: z.string().min(1, 'Date is required'),
  account_source: z.string().min(1, 'Account source is required'),
  notes: z.string().optional(),
});

export const duesPersonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
});

export const duesTransactionSchema = z.object({
  transaction_type: z.enum(['receivable', 'payable']),
  amount: z.number().positive(),
  transaction_date: z.string().optional(),
  description: z.string().optional(),
});

export const stockSchema = z.object({
  stock_symbol: z.string().min(1, 'Symbol is required'),
  company_name: z.string().optional(),
});

export const stockTransactionSchema = z.object({
  buy_date: z.string().min(1, 'Date is required'),
  buy_price: z.number().positive(),
  quantity: z.number().int().positive(),
  brokerage_fee: z.number().min(0).optional(),
});

export const bankSchema = z.object({
  name: z.string().min(1, 'Bank name is required'),
  account_no: z.string().min(1, 'Account number is required'),
  iban_no: z.string().min(1, 'IBAN is required'),
  starting_balance: z.number(),
});

export const walletSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  institution: z.string().min(1, 'Institution is required'),
  balance: z.number(),
  color_theme: z.string().optional(),
  account_num: z.string().optional(),
  currency: z.string().optional(),
  exchange_rate: z.number().optional(),
});

export const zakatSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const assetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  value: z.number().min(0).optional(),
  purchase_date: z.string().optional(),
  description: z.string().optional(),
});

export const brokerSchema = z.object({
  account_title: z.string().min(1, 'Account title is required'),
  client_code: z.string().min(1, 'Client code is required'),
  participant_acc_no: z.string().optional(),
  cdc_sub_acc_no: z.string().optional(),
  stock_pin_code: z.string().optional(),
});
```

---

## 10. QUERY KEYS (constants/queryKeys.ts)

```typescript
export const QUERY_KEYS = {
  dashboard: ['dashboard'],
  expenses: ['expenses'],
  mutualFunds: ['mutualFunds'],
  mutualFundSnapshots: ['mutualFundSnapshots'],
  stocks: ['stocks'],
  psxStocks: ['psxStocks'],
  psxSnapshots: ['psxSnapshots'],
  bankInvestments: ['bankInvestments'],
  dues: ['dues'],
  duesPerson: (id: string) => ['dues', id],
  rent: ['rent'],
  banks: ['banks'],
  bankDetail: (id: string) => ['banks', id],
  wallets: ['wallets'],
  zakat: ['zakat'],
  assets: ['assets'],
  brokers: ['brokers'],
  institutions: ['institutions'],
} as const;
```

---

## 11. COMPLETE API REFERENCE

**Base URL:** `EXPO_PUBLIC_API_URL` (from .env)
**Authentication:** All endpoints except `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, and `/psx/stocks` (GET) require:
```
Authorization: Bearer <jwt_token>
```

---

### 11.1 AUTH — `/api/auth`

#### POST `/api/auth/register`
Create new user account. Returns token immediately (no OTP on registration).
```typescript
// Request
{ name: string; email: string; password: string }

// Response 201
{
  user: { id: string; name: string; email: string; hasPin: boolean };
  token: string;
}

// Errors
// 400 — User already exists or validation failed
// 500 — Server error
```

---

#### POST `/api/auth/login`
Step 1 of login. Validates credentials and sends OTP to email.
```typescript
// Request
{ identifier: string; password: string } // identifier = email

// Response 200
{
  message: string;
  userId: string;
  email: string;
  requiresOtp: true;
}

// Errors
// 400 — Invalid credentials or missing fields
```

---

#### POST `/api/auth/verify-otp`
Step 2 of login. Verifies OTP and returns JWT token.
```typescript
// Request
{ userId: string; otp: string } // otp = 6-digit code

// Response 200
{
  message: string;
  token: string;
  user: { id: string; name: string; email: string; hasPin: boolean };
}

// Errors
// 400 — Invalid or expired OTP (expires after 10 minutes)
// 404 — User not found
```
> Store `token` in Expo SecureStore with key `'auth_token'`.

---

#### GET `/api/auth/me`
Get current user profile. Call on app start to validate stored token.
```typescript
// Response 200
{ id: string; name: string; email: string; hasPin: boolean }

// Errors
// 401 — Token missing or invalid
// 404 — User not found
```

---

#### PUT `/api/auth/pin`
Set up PIN for the first time.
```typescript
// Request
{ pin: string } // min 4 characters

// Response 200
{ message: 'PIN configured successfully' }

// Errors
// 400 — PIN too short
```

---

#### PUT `/api/auth/pin/change`
Change existing PIN.
```typescript
// Request
{ currentPin: string; newPin: string }

// Response 200
{ message: 'PIN changed successfully' }

// Errors
// 401 — Current PIN incorrect
```

---

#### POST `/api/auth/verify-pin`
Verify PIN to unmask sensitive data. Sets `isPinVerified = true` in pinStore.
```typescript
// Request
{ pin: string }

// Response 200
{ message: 'PIN verified successfully'; success: true }

// Errors
// 400 — No PIN configured
// 401 — Invalid PIN
```

---

#### POST `/api/auth/forgot-password`
Request password reset OTP.
```typescript
// Request
{ email: string }

// Response 200
{ message: 'If an account with that email exists, an OTP will be sent.' }
// Always returns 200 for security
```

---

#### POST `/api/auth/reset-password`
Reset password with OTP received by email.
```typescript
// Request
{ email: string; otp: string; newPassword: string }

// Response 200
{ message: 'Password has been reset successfully. You can now log in.' }

// Errors
// 400 — Invalid OTP or expired
```

---

### 11.2 DASHBOARD — `/api/dashboard`

#### GET `/api/dashboard/summary`
Main dashboard data. Fetch on Dashboard screen.
```typescript
// Response 200
{
  metrics: {
    netWorth: number;               // banks + wallets + investments + receivable - payable
    totalBankBalance: number;
    totalWalletBalance: number;
    totalInvestments: number;       // stocks + mutual funds
    mutualFundValue: number;
    mutualFundCost: number;
    stockValue: number;
    stockCost: number;
    totalReceivable: number;        // money owed TO user
    totalPayable: number;           // money user OWES
    totalExpenses: number;          // all time
    currentMonthExpenses: number;
    totalAssetValue: number;
  };
  charts: {
    monthlyExpenses: Array<{ month: string; amount: number }>;       // last 6 months
    investmentDistribution: Array<{ name: string; value: number }>;  // Mutual Funds, Stocks
    assetAllocation: Array<{ name: string; value: number }>;         // all asset types
  };
}
```

---

#### POST `/api/dashboard/send-summary`
Manually trigger weekly summary email.
```typescript
// Request — no body

// Response 200
{ message: 'Summary email sent successfully to farooqibex@gmail.com' }
```

---

### 11.3 EXPENSES — `/api/expenses`

#### GET `/api/expenses`
```typescript
// Response 200 — Array
Expense[] // see TypeScript interfaces section
```

---

#### POST `/api/expenses`
```typescript
// Request
{
  amount: number;           // positive
  category: string;         // required
  expense_date: string;     // YYYY-MM-DD
  payment_method?: string;  // 'Cash' | 'Card' | 'Bank Transfer' | 'Wallet' | etc.
  notes?: string;
}

// Response 201 — created Expense object
```

---

#### POST `/api/expenses/batch`
Bulk create expenses (e.g., CSV import).
```typescript
// Request — Array of expense objects (same fields as POST /)
Expense[]

// Response 201
{ message: string; count: number }
```

---

#### PUT `/api/expenses/:id`
```typescript
// Request — all fields optional
{
  amount?: number;
  category?: string;
  expense_date?: string;
  payment_method?: string;
  notes?: string;
}

// Response 200 — updated Expense object
// 404 — not found or not owned by user
```

---

#### DELETE `/api/expenses/:id`
```typescript
// Response 200
{ message: 'Expense deleted successfully' }
// 404 — not found
```

---

### 11.4 MUTUAL FUNDS — `/api/mutual-funds`

#### GET `/api/mutual-funds`
```typescript
// Response 200
{
  funds: MutualFund[];
  portfolioSummary: {
    totalInvestmentPKR: string;  // formatted string e.g. "PKR 500,000"
    currentValuePKR: string;
    totalGainLossPKR: string;
  };
}
```

---

#### POST `/api/mutual-funds`
Manually add a fund.
```typescript
// Request
{
  fund_name: string;
  fund_symbol: string;     // max 20 chars
  units: number;           // min 0
  current_nav: number;     // positive
  invested_amount: number; // positive
}

// Response 201 — created MutualFund object
// Side effect: creates an initial history snapshot
```

---

#### POST `/api/mutual-funds/upload`
Upload CSV or XLSX file. Use `multipart/form-data`.
```typescript
// Form field: file (CSV or XLSX)
// Accepted CSV columns (Meezan format):
// Funds, Type, Units, NAV, Value, "Gain/Loss FYTD", "Gain/Loss To Date"

// Response 200
{ message: string; processed: number; created: number }

// Errors
// 400 — No file uploaded
```

---

#### POST `/api/mutual-funds/sync-data`
Sync from JSON payload (alternative to file upload).
```typescript
// Request
{
  rows: Array<{
    Funds: string;
    Type?: string;
    Units: number;
    NAV: number;
    Value: number;
    'Gain/Loss FYTD'?: number;
    'Gain/Loss To Date'?: number;
  }>;
}

// Response 200
{ message: string; processed: number; created: number }
// Side effect: creates a portfolio snapshot after sync
```

---

#### DELETE `/api/mutual-funds/:id`
```typescript
// Response 200
{ message: 'Mutual fund deleted successfully' }
// 404 — not found or not owned
```

---

#### POST `/api/mutual-funds/bulk-delete`
```typescript
// Request
{ ids: string[] }

// Response 200
{ message: 'N funds deleted successfully' }
// 400 — no IDs provided
```

---

#### GET `/api/mutual-funds/snapshots`
```typescript
// Response 200 — Array
PortfolioSnapshot[]
```

---

#### DELETE `/api/mutual-funds/snapshots/:id`
```typescript
// Response 200
{ message: 'Snapshot deleted successfully' }
```

---

#### POST `/api/mutual-funds/snapshots/bulk-delete`
```typescript
// Request
{ ids: string[] }

// Response 200
{ message: 'N snapshots deleted successfully' }
```

---

#### DELETE `/api/mutual-funds/snapshots/:id/funds/:symbol`
Remove a specific fund from a snapshot (recalculates totals).
```typescript
// Response 200
{ message: 'Fund SYMBOL removed from snapshot.' }
// 404 — snapshot not found or fund not in snapshot
```

---

### 11.5 STOCKS — `/api/stocks`

#### GET `/api/stocks`
Returns stocks with all their buy transactions.
```typescript
// Response 200 — Array
Stock[] // includes transactions array
```

---

#### POST `/api/stocks`
```typescript
// Request
{ stock_symbol: string; company_name?: string }

// Response 201 — created Stock object
// 400 — stock symbol already exists for user
```

---

#### PUT `/api/stocks/:id`
Update current market price.
```typescript
// Request
{ current_market_price: number }

// Response 200 — updated Stock object
// 404 — not found
```

---

#### POST `/api/stocks/:id/transactions`
Log a buy transaction for a stock.
```typescript
// Request
{
  buy_date: string;        // YYYY-MM-DD
  buy_price: number;       // positive
  quantity: number;        // positive integer
  brokerage_fee?: number;  // default 0
}

// Response 201 — created StockTransaction object
// 404 — stock not found
```

---

#### DELETE `/api/stocks/:id`
```typescript
// Response 200
{ message: 'Stock deleted successfully' }
```

---

#### GET `/api/stocks/psx`
Get live PSX stock data (no auth required).
```typescript
// Response 200 — Array
PsxStock[]
// Fields: id, ticker, companyName, price, change, changePct, volume, high, low, marketCap, lastUpdated
```

---

#### POST `/api/stocks/psx/sync`
Trigger PSX price scraper. Scrapes HUBC, FFL, FFC, MEBL, OGDC.
```typescript
// Request — no body

// Response 200
{ message: 'Successfully updated N stocks.' }
```

---

### 11.6 PSX SNAPSHOTS — `/api/psx`

#### GET `/api/psx/snapshots`
```typescript
// Response 200 — Array
PsxSnapshot[]
```

---

#### POST `/api/psx/snapshots`
Upload a PSX portfolio snapshot.
```typescript
// Request
{
  snapshot_date: string;       // YYYY-MM-DD
  total_custody: number;
  holdings_data: Array<{
    symbol: string;
    holding: number;
    market_rate: number;
    custody_val: number;
    cost_per_unit?: number;
    total_cost?: number;
  }>;
}

// Response 200 — created PsxSnapshot object
```

---

#### POST `/api/psx/sync-data`
Sync/upsert a PSX snapshot (same body as POST /snapshots).
```typescript
// Response 200
{ message: 'PSX data for {date} synced successfully'; snapshot: PsxSnapshot }
```

---

#### PUT `/api/psx/snapshots/:id/summary`
Update summary data on an existing snapshot.
```typescript
// Request
{
  summary_data: {
    trading_cash?: number;
    working_capital?: number;
    total_worth?: number;
    margin_pct?: number;
    [key: string]: any;
  };
}

// Response 200 — updated PsxSnapshot object
```

---

#### DELETE `/api/psx/snapshots/:id`
```typescript
// Response 200
{ message: 'Snapshot deleted successfully' }
```

---

#### DELETE `/api/psx/snapshots/:id/symbols/:symbol`
Remove a specific symbol from a snapshot.
```typescript
// Response 200
{ message: 'Symbol {symbol} removed from snapshot.' }
```

---

### 11.7 BANK INVESTMENTS — `/api/psx/investments`

These track cash deposits and withdrawals in the PSX brokerage account.

#### GET `/api/psx/investments`
```typescript
// Response 200
{
  investments: BankInvestment[];
  total_invested: number;  // sum of all amounts
}
```

---

#### POST `/api/psx/investments`
```typescript
// Request
{
  transaction_date: string;  // YYYY-MM-DD
  amount: number;            // positive = deposit, negative = withdrawal
  description?: string;
}

// Response 201 — created BankInvestment object
```

---

#### DELETE `/api/psx/investments/:id`
```typescript
// Response 200
{ message: 'Investment record deleted successfully' }
```

---

### 11.8 DUES LEDGER — `/api/dues`

#### GET `/api/dues`
Returns all people with their transactions and calculated net balance.
```typescript
// Response 200 — Array
DuesPerson[]
// netBalance > 0 = money owed TO user (receivable)
// netBalance < 0 = user OWES (payable)
```

---

#### POST `/api/dues`
Add a new person to the ledger.
```typescript
// Request
{ name: string; email?: string }

// Response 201 — created DuesPerson object (without transactions)
// 400 — person with same name already exists
```

---

#### PUT `/api/dues/:id`
Update person details.
```typescript
// Request
{ name?: string; email?: string }

// Response 200 — updated DuesPerson object
```

---

#### DELETE `/api/dues/:id`
Delete person AND all their transactions.
```typescript
// Response 200
{ message: 'Person and all associated ledgers deleted' }
```

---

#### POST `/api/dues/:id/transactions`
Add a transaction for a person.
```typescript
// Request
{
  transaction_type: 'receivable' | 'payable';
  amount: number;               // positive
  transaction_date?: string;    // YYYY-MM-DD, defaults to today
  description?: string;
}

// Response 201 — created DuesTransaction object
```

---

#### PUT `/api/dues/transactions/:txId`
Update a transaction.
```typescript
// Request
{
  description?: string;
  amount?: number;
  transaction_date?: string;
  transaction_type?: 'receivable' | 'payable';
}

// Response 200 — updated DuesTransaction object
```

---

#### POST `/api/dues/transactions/delete`
Delete multiple transactions by IDs.
```typescript
// Request
{ ids: string[] }

// Response 200
{ message: 'Deleted N entries'; deleted: number }
```

---

#### POST `/api/dues/transactions/bulk-type`
Toggle transaction type for multiple entries.
```typescript
// Request
{ ids: string[]; transaction_type: 'receivable' | 'payable' }

// Response 200
{ message: 'Updated N entries to {type}'; updated: number }
```

---

#### POST `/api/dues/:id/upload-csv`
Bulk import transactions from CSV file.
```typescript
// Form field: file (CSV)
// Required CSV columns: Detail (or detail, DETAIL), Dues (or dues, DUES, Price, price, PRICE)
// All imported entries are treated as 'receivable' type

// Response 200
{ message: 'Successfully imported N entries'; imported: number }
```

---

#### POST `/api/dues/:id/reminder`
Send reminder email to person about outstanding balance.
```typescript
// Request — no body

// Response 200
{ message: 'Reminder email successfully dispatched to {email}' }

// Errors
// 400 — Person has no email, or netBalance is not positive
// 404 — Person not found
```

---

### 11.9 RENT TRACKER — `/api/rents`

#### GET `/api/rents`
```typescript
// Response 200
{
  entries: RentEntry[];
  totalReceived: number;
  byYear: Record<string, RentEntry[]>;  // grouped by year string
}
```

---

#### POST `/api/rents`
```typescript
// Request
{
  month: string;         // e.g. 'January', 'February', etc.
  year: number;          // 2000–2100
  payer_name: string;
  amount: number;        // positive
  payment_date: string;  // YYYY-MM-DD
  account_source: string;
  notes?: string;
}

// Response 201 — created RentEntry object
```

---

#### PUT `/api/rents/:id`
```typescript
// Request — all optional
{
  month?: string; year?: number; payer_name?: string;
  amount?: number; payment_date?: string; account_source?: string; notes?: string;
}

// Response 200 — updated RentEntry object
```

---

#### DELETE `/api/rents/:id`
```typescript
// Response 200
{ message: 'Rent entry deleted' }
```

---

### 11.10 BANKS — `/api/banks`

#### GET `/api/banks`
```typescript
// Response 200 — Array
Bank[]
```

---

#### POST `/api/banks`
```typescript
// Request
{
  name: string;
  account_no: string;
  iban_no: string;
  starting_balance: number;
}

// Response 201 — created Bank object
// current_balance is initially set to starting_balance
```

---

#### GET `/api/banks/:id`
Returns bank with all statements.
```typescript
// Response 200
BankDetail  // Bank + statements: BankStatement[]
```

---

#### PUT `/api/banks/:id`
Update bank details.
```typescript
// Request — all optional
{
  name?: string; account_no?: string; iban_no?: string;
  starting_balance?: number; currency?: string; exchange_rate?: number;
}

// Response 200 — updated Bank object
```

---

#### PUT `/api/banks/:id/balance`
Update only the current balance.
```typescript
// Request
{ current_balance: number }

// Response 200 — updated Bank object
```

---

#### DELETE `/api/banks/:id`
```typescript
// Response 200
{ message: 'Bank deleted successfully' }
```

---

### 11.11 WALLETS — `/api/wallets`

#### GET `/api/wallets`
```typescript
// Response 200 — Array
Wallet[]
```

---

#### POST `/api/wallets`
```typescript
// Request
{
  name: string;
  institution: string;
  balance: number;
  color_theme?: string;   // default: 'blue'
  account_num?: string;
  currency?: string;      // default: 'PKR'
  exchange_rate?: number; // default: 1.00
}

// Response 201 — created Wallet object
```

---

#### PUT `/api/wallets/:id`
Update wallet balance (and optionally other fields).
```typescript
// Request
{ balance: number }

// Response 200 — updated Wallet object
```

---

#### DELETE `/api/wallets/:id`
```typescript
// Response 200
{ message: 'Wallet deleted successfully' }
```

---

### 11.12 ZAKAT — `/api/zakat`

#### GET `/api/zakat`
```typescript
// Response 200
{
  entries: ZakatEntry[];
  currentYearTotal: number;  // sum for current calendar year
}
```

---

#### POST `/api/zakat`
```typescript
// Request
{
  amount: number;       // positive
  description?: string;
  date?: string;        // YYYY-MM-DD, defaults to today
}

// Response 201 — created ZakatEntry object
```

---

#### DELETE `/api/zakat/:id`
```typescript
// Response 200
{ message: 'Entry deleted successfully' }
```

---

### 11.13 ASSETS — `/api/assets`

#### GET `/api/assets`
```typescript
// Response 200
{
  assets: Asset[];
  totalValue: number;
}
```

---

#### POST `/api/assets`
```typescript
// Request
{
  name: string;
  type: string;           // 'property' | 'gold' | 'vehicle' | 'other' | custom string
  value?: number;         // default 0
  purchase_date?: string; // YYYY-MM-DD
  description?: string;
}

// Response 201 — created Asset object
// 400 — name or type missing
```

---

#### DELETE `/api/assets/:id`
```typescript
// Response 200
{ message: 'Asset deleted successfully' }
// 403 — not owned by user
// 404 — not found
```

---

### 11.14 BROKER ACCOUNTS — `/api/broker-accounts`

#### GET `/api/broker-accounts`
```typescript
// Response 200 — Array
BrokerAccount[]
```

---

#### POST `/api/broker-accounts`
```typescript
// Request
{
  account_title: string;
  client_code: string;
  participant_acc_no?: string;
  cdc_sub_acc_no?: string;
  stock_pin_code?: string;
}

// Response 201 — created BrokerAccount object
```

---

#### DELETE `/api/broker-accounts/:id`
```typescript
// Response 200
{ message: 'Broker account deleted successfully' }
// 403 — not owned
// 404 — not found
```

---

### 11.15 INSTITUTIONS — `/api/institutions`

Reference data for bank/wallet dropdown selectors.

#### GET `/api/institutions`
```typescript
// Response 200 — Array
Institution[]
// type: 'bank' | 'wallet' | 'cash' | 'other'
```

---

#### POST `/api/institutions`
```typescript
// Request
{
  name: string;                              // min 1, max 100
  type?: 'bank' | 'wallet' | 'cash' | 'other';  // default: 'bank'
  color?: string;                            // tailwind color name, default: 'blue'
}

// Response 201 — created Institution object
// 400 — duplicate name or validation error
```

---

#### POST `/api/institutions/seed`
Seed default Pakistani institutions.
```typescript
// Request — no body

// Default institutions seeded:
// Standard Chartered (bank, emerald)
// Habib Metro (bank, purple)
// Easy Paisa (wallet, emerald)
// Jazz Cash (wallet, rose)
// Naya Pay (wallet, amber)
// Cash in Hand (cash, slate)

// Response 200
{ message: 'Seeded N default institutions.' }
```

---

#### DELETE `/api/institutions/:id`
```typescript
// Response 200
{ message: 'Institution removed' }
// 401 — not authorized
```

---

## 12. TANSTACK QUERY HOOKS

Create one hook file per resource. Pattern for all hooks:

```typescript
// hooks/useExpenses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getApiError } from '../services/api';
import { QUERY_KEYS } from '../constants/queryKeys';
import { Expense } from '../types/api';
import Toast from 'react-native-toast-message';

export function useExpenses() {
  return useQuery({
    queryKey: QUERY_KEYS.expenses,
    queryFn: async () => {
      const { data } = await api.get<Expense[]>('/expenses');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Expense>) => {
      const { data } = await api.post<Expense>('/expenses', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      Toast.show({ type: 'success', text1: 'Expense added' });
    },
    onError: (error) => {
      Toast.show({ type: 'error', text1: getApiError(error) });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Expense> & { id: string }) => {
      const { data } = await api.put<Expense>(`/expenses/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
      Toast.show({ type: 'success', text1: 'Expense updated' });
    },
    onError: (error) => {
      Toast.show({ type: 'error', text1: getApiError(error) });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      Toast.show({ type: 'success', text1: 'Expense deleted' });
    },
  });
}
```

Follow this exact pattern for all 14 resources.

**Query invalidation rules:**
- After any expense mutation → invalidate `expenses` + `dashboard`
- After any mutual fund mutation → invalidate `mutualFunds` + `mutualFundSnapshots` + `dashboard`
- After any stock mutation → invalidate `stocks` + `dashboard`
- After any dues mutation → invalidate `dues` + `dashboard`
- After any bank mutation → invalidate `banks` + `dashboard`
- After any wallet mutation → invalidate `wallets` + `dashboard`
- After any asset mutation → invalidate `assets` + `dashboard`
- After any zakat mutation → invalidate `zakat`
- After any rent mutation → invalidate `rent`

---

## 13. AUTH FLOW (Root Layout)

```typescript
// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { setAuth, clearAuth, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setAuth(data);
        } catch {
          await SecureStore.deleteItemAsync('auth_token');
          clearAuth();
        }
      }
      setIsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) router.replace('/(auth)/login');
    if (isAuthenticated && inAuthGroup) router.replace('/(tabs)');
  }, [isAuthenticated, isReady]);

  if (!isReady) return null; // Show splash screen here

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
```

---

## 14. DESIGN SYSTEM

### Colors (constants/colors.ts)
```typescript
export const colors = {
  primary: '#0F172A',        // Deep Navy — backgrounds
  accent: '#10B981',         // Emerald Green — buttons, CTAs
  accentLight: '#D1FAE5',    // Emerald light — backgrounds
  warning: '#F59E0B',        // Amber — warnings, alerts
  danger: '#EF4444',         // Red — losses, errors, delete
  dangerLight: '#FEE2E2',    // Red light — backgrounds
  success: '#10B981',        // Green — gains, success toasts
  surface: '#FFFFFF',        // Card backgrounds (light)
  surfaceDark: '#1E293B',    // Card backgrounds (dark)
  background: '#F8FAFC',     // Page background (light)
  backgroundDark: '#0F172A', // Page background (dark)
  text: '#0F172A',           // Primary text
  textSecondary: '#64748B',  // Secondary text (slate-500)
  textMuted: '#94A3B8',      // Muted text (slate-400)
  border: '#E2E8F0',         // Borders (slate-200)
  borderDark: '#334155',     // Dark mode borders
  gain: '#10B981',           // Positive amounts
  loss: '#EF4444',           // Negative amounts
};
```

### Typography Scale
- Display: 28px, weight 700
- Title: 22px, weight 700
- Subtitle: 18px, weight 600
- Body: 15px, weight 400
- Caption: 13px, weight 400
- Micro: 11px, weight 500

### Spacing
- xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48

### Border Radius
- Card: 16, Input: 12, Badge: 8, Button: 12

---

## 15. ALL SCREENS (Complete List)

### Auth Screens
| Screen | Route | APIs Used |
|---|---|---|
| Login | `(auth)/login` | POST /auth/login |
| OTP Verification | `(auth)/otp-verification` | POST /auth/verify-otp |
| Register | `(auth)/register` | POST /auth/register |
| Forgot Password | `(auth)/forgot-password` | POST /auth/forgot-password |
| Reset Password | `(auth)/reset-password` | POST /auth/reset-password |
| PIN Setup | `(auth)/pin-setup` | PUT /auth/pin |

### Main Screens
| Screen | Route | APIs Used |
|---|---|---|
| Dashboard | `(tabs)/index` | GET /dashboard/summary |
| Expenses | `(tabs)/expenses` | GET, POST, PUT, DELETE /expenses |
| Portfolio Home | `(tabs)/portfolio/index` | GET /mutual-funds, GET /stocks |
| Mutual Funds | `(tabs)/portfolio/mutual-funds` | GET, POST, DELETE /mutual-funds + upload |
| MF Snapshots | `(tabs)/portfolio/mutual-fund-snapshots` | GET, DELETE /mutual-funds/snapshots |
| Stocks | `(tabs)/portfolio/stocks` | GET, POST, PUT, DELETE /stocks + psx |
| PSX Snapshots | `(tabs)/portfolio/psx-snapshots` | GET, POST, DELETE /psx/snapshots + investments |
| Accounts | `(tabs)/accounts` | GET /banks + /wallets |
| More | `(tabs)/more` | Navigation hub |
| Dues List | `dues/index` | GET /dues |
| Person Ledger | `dues/[personId]` | GET /dues, POST transactions, DELETE |
| Stock Detail | `stocks/[stockId]` | GET /stocks, POST transactions |
| Bank Detail | `banks/[bankId]` | GET /banks/:id |
| Rent Tracker | (in More) | GET, POST, PUT, DELETE /rents |
| Zakat | (in More) | GET, POST, DELETE /zakat |
| Assets | (in More) | GET, POST, DELETE /assets |
| Reports | (in More) | GET /dashboard/summary (charts) |
| Settings | (in More) | GET /auth/me, PUT /auth/pin/change, GET/POST /broker-accounts, GET/POST /institutions |
| PIN Entry | `pin-entry` | POST /auth/verify-pin |

---

## 16. PIN GATE COMPONENT

The `MaskedBalance` component shows `PKR ****` by default. Tapping it opens a PIN entry bottom sheet. On success, `isPinVerified = true` in pinStore and all masked balances reveal.

```typescript
// components/ui/MaskedBalance.tsx
import { usePinStore } from '../../stores/pinStore';
import { fmtPKR } from '../../utils/currency';

interface Props {
  value: number | string;
  size?: 'sm' | 'md' | 'lg';
  onRevealPress?: () => void;
}

export function MaskedBalance({ value, size = 'md', onRevealPress }: Props) {
  const isPinVerified = usePinStore((s) => s.isPinVerified);

  if (!isPinVerified) {
    return (
      <TouchableOpacity onPress={onRevealPress}>
        <Text style={styles[size]}>PKR ****</Text>
        <Ionicons name="eye-off-outline" size={16} />
      </TouchableOpacity>
    );
  }

  return <Text style={styles[size]}>{fmtPKR(value)}</Text>;
}
```

> PIN resets automatically when app goes to background (handled in pinStore.ts via AppState listener).

---

## 17. FILE UPLOAD FLOW

For mutual fund CSV upload and dues CSV upload:

```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

async function pickAndUpload() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return;

  const file = result.assets[0];
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'text/csv',
  } as any);

  await api.post('/mutual-funds/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      const pct = Math.round((e.loaded * 100) / (e.total ?? 1));
      setUploadProgress(pct);
    },
  });

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
```

---

## 18. CHARTS

Use Victory Native XL for all charts.

### Bar Chart — Monthly Expenses
```typescript
// Render monthlyExpenses from dashboard API
// X axis: month names, Y axis: PKR amount
// Tap bar to show tooltip with exact amount
```

### Donut Chart — Fund Allocation
```typescript
// Render funds as pie/donut slices
// Each slice = fund_name + percentage of total value
// Tap slice to highlight and show fund name + value
```

### Line Chart — Portfolio Snapshots
```typescript
// X axis: upload_date from PortfolioSnapshot[]
// Y axis: total_value
// Points for each snapshot date
```

---

## 19. UX REQUIREMENTS

| Requirement | Implementation |
|---|---|
| Loading state | Skeleton loaders (not spinners) for initial data fetch |
| Mutation feedback | Activity indicator on button during mutation |
| Empty states | Custom EmptyState component with icon + message + CTA button |
| Pull to refresh | `RefreshControl` on all ScrollView/FlatList screens |
| Delete gesture | `SwipeableRow` (react-native-gesture-handler) — swipe left to reveal delete |
| Haptic feedback | `Haptics.notificationAsync(Success)` on create/delete success |
| Toast | `react-native-toast-message` — success (green), error (red), info (blue) |
| Forms | `BottomSheet` component (not full-screen modal) for add/edit forms |
| Masked balances | `MaskedBalance` component — reveals with PIN |
| Safe area | Use `useSafeAreaInsets()` everywhere |
| Dark mode | Read from `themeStore`, apply to all components |
| Navigation | Back button on all nested screens |

---

## 20. SCAFFOLD COMMANDS

```bash
# Create project
npx create-expo-app@latest finance-manager-mobile --template expo-template-blank-typescript
cd finance-manager-mobile

# Core dependencies
npx expo install expo-router expo-secure-store expo-document-picker expo-haptics expo-font

# Data & state
npm install @tanstack/react-query axios zustand

# Forms & validation
npm install react-hook-form zod @hookform/resolvers

# Animations & gestures
npm install react-native-reanimated react-native-gesture-handler

# Charts
npm install victory-native @shopify/react-native-skia

# Utilities
npm install currency.js date-fns react-native-toast-message

# Safe area
npx expo install react-native-safe-area-context react-native-screens

# Configure Expo Router in app.json
# Set "scheme": "finance-manager" and "expo.web.bundler": "metro"
```

---

## 21. DOCUMENTATION TO GENERATE

Include these files in the project:

1. **README.md** — Setup, env vars, run commands, project description
2. **ARCHITECTURE.md** — Folder structure, data flow, auth flow diagram
3. **API.md** — All endpoints reference (can reference this document)
4. **COMPONENTS.md** — Every shared component, its props, and usage example
5. **SCREENS.md** — Every screen, its route, and which APIs it uses
6. Inline JSDoc on all hooks, utility functions, and complex components
7. All TypeScript interfaces in `types/api.ts` (already defined above)

---

## 22. ERROR HANDLING RULES

```typescript
// Every API call must handle errors this way:
try {
  await mutation.mutateAsync(data);
} catch (error) {
  // getApiError() extracts error.response.data.message or falls back gracefully
  Toast.show({ type: 'error', text1: getApiError(error) });
}

// HTTP status handling:
// 400 → Show field-level form errors (parse error.response.data)
// 401 → Handled by Axios interceptor → redirect to login
// 403 → Show "Not authorized" toast
// 404 → Show "Not found" toast
// 500 → Show "Something went wrong, try again" toast
// Network error → Show "No internet connection" toast
```

---

## 23. TESTING CHECKLIST

After building, verify end-to-end:

- [ ] Register → receive OTP → login → land on Dashboard
- [ ] JWT persists across app restarts (via SecureStore)
- [ ] 401 response clears token and redirects to login
- [ ] PIN masking: all balances show `****` on Dashboard
- [ ] PIN entry reveals balances
- [ ] PIN resets when app goes to background
- [ ] Add expense → appears in list → Dashboard updates
- [ ] Upload mutual fund CSV → funds appear in list
- [ ] Sync PSX prices → stock prices update
- [ ] Add dues person → add receivable → add payable → net balance correct
- [ ] Send reminder email → success toast
- [ ] File upload shows progress bar
- [ ] Pull to refresh works on all list screens
- [ ] Swipe to delete works on expenses, dues, rent entries
- [ ] Dark mode toggles correctly
- [ ] App works on both iOS Simulator and Android Emulator
- [ ] Test on real device for file picker (Expo DocumentPicker)
