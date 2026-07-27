-- Per-user tracked tickers. Replaces the 14-symbol array that was hardcoded
-- twice in frontend/src/pages/Stocks.jsx and injected into the allocation
-- donut as zero-value slices.

-- CreateTable
CREATE TABLE "watchlist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ticker" VARCHAR(20) NOT NULL,
    "notes" TEXT,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlist_user_id_idx" ON "watchlist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_user_id_ticker_key" ON "watchlist"("user_id", "ticker");

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
