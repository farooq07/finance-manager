-- Daily end-of-day price per PSX ticker.
-- psx_stocks holds only the current price and is overwritten on each sync,
-- so this is the first table in the app that retains equity price history.
-- `date` is the Asia/Karachi trading day (see backend/src/utils/dates.js).

-- CreateTable
CREATE TABLE "psx_price_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticker" VARCHAR(20) NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(15,4),
    "high" DECIMAL(15,4),
    "low" DECIMAL(15,4),
    "close" DECIMAL(15,4) NOT NULL,
    "volume" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psx_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "psx_price_history_ticker_date_idx" ON "psx_price_history"("ticker", "date");

-- CreateIndex
CREATE UNIQUE INDEX "psx_price_history_ticker_date_key" ON "psx_price_history"("ticker", "date");
