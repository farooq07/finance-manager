-- Category budgets and savings goals.
CREATE TABLE "budgets" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"        UUID NOT NULL,
    "category"       VARCHAR(100) NOT NULL,
    "monthly_amount" DECIMAL(15,2) NOT NULL,
    "rollover"       BOOLEAN NOT NULL DEFAULT false,
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "budgets_user_id_category_key" ON "budgets"("user_id", "category");
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "savings_goals" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"       UUID NOT NULL,
    "name"          VARCHAR(100) NOT NULL,
    "target_amount" DECIMAL(15,2) NOT NULL,
    "saved_amount"  DECIMAL(15,2) NOT NULL DEFAULT 0,
    "target_date"   DATE,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "savings_goals_user_id_idx" ON "savings_goals"("user_id");
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
