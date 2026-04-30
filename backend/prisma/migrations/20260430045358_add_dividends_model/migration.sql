-- CreateTable
CREATE TABLE "dividends" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_id" VARCHAR(100),
    "security_symbol" VARCHAR(50) NOT NULL,
    "security_name" VARCHAR(255),
    "iban" VARCHAR(100),
    "financial_year" VARCHAR(50),
    "gross_dividend_amount" DECIMAL(15,2) NOT NULL,
    "net_dividend_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(50),
    "payment_date" DATE,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dividends_user_id_event_id_key" ON "dividends"("user_id", "event_id");

-- AddForeignKey
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
