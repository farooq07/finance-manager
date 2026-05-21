-- Bills / subscriptions / recurring payments
CREATE TABLE "recurring_payments" (
    "id"               UUID            NOT NULL DEFAULT gen_random_uuid(),
    "user_id"          UUID            NOT NULL,
    "name"             TEXT            NOT NULL,
    "amount"           DECIMAL(15, 2)  NOT NULL,
    "currency"         VARCHAR(8)      NOT NULL DEFAULT 'PKR',
    "category"         TEXT,
    "frequency"        VARCHAR(16)     NOT NULL,
    "next_due_date"    DATE            NOT NULL,
    "auto_debit"       BOOLEAN         NOT NULL DEFAULT FALSE,
    "bank_id"          UUID,
    "reminder_days"    INTEGER         NOT NULL DEFAULT 3,
    "is_active"        BOOLEAN         NOT NULL DEFAULT TRUE,
    "last_paid_at"     TIMESTAMPTZ(6),
    "last_reminder_at" TIMESTAMPTZ(6),
    "notes"            TEXT,
    "created_at"       TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),
    "updated_at"       TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),

    CONSTRAINT "recurring_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recurring_payments_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "recurring_payments_user_id_next_due_date_idx"
    ON "recurring_payments" ("user_id", "next_due_date");
CREATE INDEX "recurring_payments_user_id_is_active_idx"
    ON "recurring_payments" ("user_id", "is_active");

-- Institutional debt (credit cards, loans). Distinct from interpersonal dues.
CREATE TABLE "debts" (
    "id"              UUID            NOT NULL DEFAULT gen_random_uuid(),
    "user_id"         UUID            NOT NULL,
    "name"            TEXT            NOT NULL,
    "debt_type"       VARCHAR(32)     NOT NULL,
    "principal"       DECIMAL(15, 2)  NOT NULL,
    "outstanding"     DECIMAL(15, 2)  NOT NULL,
    "interest_rate"   DECIMAL(5, 2),
    "minimum_payment" DECIMAL(15, 2),
    "due_day"         INTEGER,
    "start_date"      DATE,
    "target_payoff"   DATE,
    "institution_id"  UUID,
    "notes"           TEXT,
    "is_active"       BOOLEAN         NOT NULL DEFAULT TRUE,
    "created_at"      TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "debts_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "debts_user_id_is_active_idx" ON "debts" ("user_id", "is_active");

CREATE TABLE "debt_payments" (
    "id"                UUID            NOT NULL DEFAULT gen_random_uuid(),
    "debt_id"           UUID            NOT NULL,
    "user_id"           UUID            NOT NULL,
    "amount"            DECIMAL(15, 2)  NOT NULL,
    "paid_at"           TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),
    "principal_portion" DECIMAL(15, 2),
    "interest_portion"  DECIMAL(15, 2),
    "notes"             TEXT,
    "created_at"        TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),

    CONSTRAINT "debt_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "debt_payments_debt_id_fkey"
        FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "debt_payments_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "debt_payments_debt_id_paid_at_idx" ON "debt_payments" ("debt_id", "paid_at");
CREATE INDEX "debt_payments_user_id_paid_at_idx" ON "debt_payments" ("user_id", "paid_at");
