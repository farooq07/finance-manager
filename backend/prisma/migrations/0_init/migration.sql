-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'user',
    "app_pin_code" VARCHAR(255),
    "otp_code" VARCHAR(6),
    "otp_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "expense_date" DATE NOT NULL,
    "payment_method" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mutual_funds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "fund_name" VARCHAR(255) NOT NULL,
    "fund_symbol" VARCHAR(50) NOT NULL,
    "units" DECIMAL(15,4) NOT NULL,
    "current_nav" DECIMAL(10,4) NOT NULL,
    "current_value" DECIMAL(15,2) NOT NULL,
    "invested_amount" DECIMAL(15,2) NOT NULL,
    "gain_loss_fytd" DECIMAL(15,2),
    "gain_loss_since_inception" DECIMAL(15,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mutual_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mutual_fund_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mutual_fund_id" UUID NOT NULL,
    "nav" DECIMAL(10,4) NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "record_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mutual_fund_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stock_symbol" VARCHAR(20) NOT NULL,
    "company_name" VARCHAR(255),
    "current_market_price" DECIMAL(15,2) DEFAULT 0.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "buy_date" DATE NOT NULL,
    "buy_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "brokerage_fee" DECIMAL(10,2) DEFAULT 0.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dues_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "transaction_type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dues_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "month" VARCHAR(20) NOT NULL,
    "year" INTEGER NOT NULL,
    "payer_name" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "account_source" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "upload_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_value" DECIMAL(15,2) NOT NULL,
    "total_gain" DECIMAL(15,2) NOT NULL,
    "total_invested" DECIMAL(15,2) NOT NULL,
    "funds_data" JSONB NOT NULL,

    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psx_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "total_custody" DECIMAL(15,2) NOT NULL,
    "total_invested" DECIMAL(15,2) NOT NULL,
    "holdings_data" JSONB NOT NULL,
    "summary_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psx_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_investments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "transaction_date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "institution" VARCHAR(100) NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'PKR',
    "exchange_rate" DECIMAL(15,4) NOT NULL DEFAULT 1.00,
    "color_theme" VARCHAR(50) NOT NULL DEFAULT 'blue',
    "account_num" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "account_no" VARCHAR(100) NOT NULL,
    "iban_no" VARCHAR(100) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'PKR',
    "exchange_rate" DECIMAL(15,4) NOT NULL DEFAULT 1.00,
    "starting_balance" DECIMAL(15,2) NOT NULL,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bank_id" UUID NOT NULL,
    "month" VARCHAR(20) NOT NULL,
    "year" INTEGER NOT NULL,
    "file_path" TEXT,
    "upload_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactions" JSONB,
    "closing_balance" DECIMAL(15,2),

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'bank',
    "color" VARCHAR(20) NOT NULL DEFAULT 'blue',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "account_title" VARCHAR(255) NOT NULL,
    "client_code" VARCHAR(100) NOT NULL,
    "participant_acc_no" VARCHAR(100),
    "cdc_sub_acc_no" VARCHAR(100),
    "stock_pin_code" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zakat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zakat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "value" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "purchase_date" DATE,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psx_stocks" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "change" DECIMAL(10,2) NOT NULL,
    "changePct" DECIMAL(5,2) NOT NULL,
    "volume" BIGINT NOT NULL,
    "high" DECIMAL(10,2) NOT NULL,
    "low" DECIMAL(10,2) NOT NULL,
    "marketCap" DECIMAL(18,2),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psx_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "psx_snapshots_user_id_snapshot_date_key" ON "psx_snapshots"("user_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_user_id_name_key" ON "institutions"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "psx_stocks_ticker_key" ON "psx_stocks"("ticker");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutual_funds" ADD CONSTRAINT "mutual_funds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutual_fund_history" ADD CONSTRAINT "mutual_fund_history_mutual_fund_id_fkey" FOREIGN KEY ("mutual_fund_id") REFERENCES "mutual_funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dues_transactions" ADD CONSTRAINT "dues_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dues_transactions" ADD CONSTRAINT "dues_transactions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_entries" ADD CONSTRAINT "rent_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psx_snapshots" ADD CONSTRAINT "psx_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_investments" ADD CONSTRAINT "bank_investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banks" ADD CONSTRAINT "banks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_accounts" ADD CONSTRAINT "broker_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zakat" ADD CONSTRAINT "zakat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

