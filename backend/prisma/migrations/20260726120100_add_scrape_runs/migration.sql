-- Records the outcome of each scrape run so the UI can show real staleness.
-- psx_stocks.lastUpdated is @updatedAt and bumps on every write including a
-- degraded one, so it cannot distinguish a good sync from a bad one.

-- CreateTable
CREATE TABLE "scrape_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" VARCHAR(32) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "tickers_ok" INTEGER NOT NULL DEFAULT 0,
    "tickers_failed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scrape_runs_source_started_at_idx" ON "scrape_runs"("source", "started_at");
