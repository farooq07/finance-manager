-- Columns and types production received from `prisma db push` without a
-- migration. On production every statement is a no-op (checked 2026-10-27);
-- on a fresh database it completes the schema.
ALTER TABLE "bank_statements" ADD COLUMN IF NOT EXISTS "file_hash" VARCHAR(64),
                              ADD COLUMN IF NOT EXISTS "opening_balance" DECIMAL(15,2),
                              ADD COLUMN IF NOT EXISTS "password_encrypted" TEXT,
                              ADD COLUMN IF NOT EXISTS "processing_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
                              ADD COLUMN IF NOT EXISTS "total_credits" DECIMAL(15,2) NOT NULL DEFAULT 0,
                              ADD COLUMN IF NOT EXISTS "total_debits" DECIMAL(15,2) NOT NULL DEFAULT 0,
                              ADD COLUMN IF NOT EXISTS "transaction_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "gold_items" ADD COLUMN IF NOT EXISTS "image_url" TEXT,
                         ADD COLUMN IF NOT EXISTS "purchase_price_per_gram" DECIMAL(12,2);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expires" TIMESTAMPTZ(6),
                    ADD COLUMN IF NOT EXISTS "email_verification_token" VARCHAR(128),
                    ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false,
                    ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "psx_stocks" ALTER COLUMN "price" SET DATA TYPE DECIMAL(15,4),
                         ALTER COLUMN "change" SET DATA TYPE DECIMAL(15,4),
                         ALTER COLUMN "changePct" SET DATA TYPE DECIMAL(15,4),
                         ALTER COLUMN "high" SET DATA TYPE DECIMAL(15,4),
                         ALTER COLUMN "low" SET DATA TYPE DECIMAL(15,4),
                         ALTER COLUMN "marketCap" SET DATA TYPE DECIMAL(18,4);
