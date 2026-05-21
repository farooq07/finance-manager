-- Daily net-worth history. Written by the nightly cron job.
CREATE TABLE "networth_snapshots" (
    "id"                 UUID            NOT NULL DEFAULT gen_random_uuid(),
    "user_id"            UUID            NOT NULL,
    "captured_at"        TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),
    "bank_total"         DECIMAL(15, 2)  NOT NULL,
    "wallet_total"       DECIMAL(15, 2)  NOT NULL,
    "investment_total"   DECIMAL(15, 2)  NOT NULL,
    "asset_total"        DECIMAL(15, 2)  NOT NULL,
    "receivable_total"   DECIMAL(15, 2)  NOT NULL,
    "payable_total"      DECIMAL(15, 2)  NOT NULL,
    "rent_balance_total" DECIMAL(15, 2)  NOT NULL,
    "expense_total"      DECIMAL(15, 2)  NOT NULL,
    "net_worth"          DECIMAL(15, 2)  NOT NULL,

    CONSTRAINT "networth_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "networth_snapshots_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "networth_snapshots_user_id_captured_at_idx"
    ON "networth_snapshots" ("user_id", "captured_at");
