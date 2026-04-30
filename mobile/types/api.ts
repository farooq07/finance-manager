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
  amount: string;
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
  funds_data: Record<string, unknown>[];
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
  summary_data: Record<string, unknown> | null;
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
  transactions: Record<string, unknown>;
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
