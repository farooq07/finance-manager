-- Time-series of FX rates. The fxRate service fetches daily and inserts
-- one row per pair. Consumers should query the latest row per (base, quote).
CREATE TABLE "fx_rates" (
    "id"         UUID            NOT NULL DEFAULT gen_random_uuid(),
    "base"       VARCHAR(8)      NOT NULL,
    "quote"      VARCHAR(8)      NOT NULL,
    "rate"       DECIMAL(15, 6)  NOT NULL,
    "fetched_at" TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),
    "source"     VARCHAR(32)     NOT NULL,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fx_rates_base_quote_fetched_at_idx"
    ON "fx_rates" ("base", "quote", "fetched_at");
