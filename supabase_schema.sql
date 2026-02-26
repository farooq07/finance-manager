-- Run this in your Supabase SQL Editor to create tables and RLS policies

-- 1. Expenses Table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Mutual Funds Table
CREATE TABLE mutual_funds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fund_name VARCHAR(255) NOT NULL,
  investment_date DATE NOT NULL,
  invested_amount DECIMAL(15, 2) NOT NULL,
  units_purchased DECIMAL(15, 4) NOT NULL,
  nav_at_purchase DECIMAL(10, 4) NOT NULL,
  current_nav DECIMAL(10, 4) NOT NULL,
  maturity_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'matured')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Stocks Table
CREATE TABLE stocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_symbol VARCHAR(20) NOT NULL,
  company_name VARCHAR(255),
  current_market_price DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Stock Transactions Table
CREATE TABLE stock_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  buy_date DATE NOT NULL,
  buy_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  brokerage_fee DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. People (Dues Ledger)
CREATE TABLE people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Dues Transactions
CREATE TABLE dues_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('receivable', 'payable')),
  amount DECIMAL(15, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutual_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues_transactions ENABLE ROW LEVEL SECURITY;

-- Create Policies (Users can only read/update/delete their own rows)
CREATE POLICY "Users can manage their own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own mutual_funds" ON mutual_funds FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own stocks" ON stocks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own stock_transactions" ON stock_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own people" ON people FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own dues_transactions" ON dues_transactions FOR ALL USING (auth.uid() = user_id);
