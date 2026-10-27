-- Transaction log ids are cuids, not uuids: storing one in a UUID column
-- failed and the row was silently dropped from the import.
ALTER TABLE "bank_transaction_logs"   ALTER COLUMN "duplicate_of_id" TYPE TEXT;
ALTER TABLE "wallet_transaction_logs" ALTER COLUMN "duplicate_of_id" TYPE TEXT;
ALTER TABLE "bank_transaction_logs"   ADD COLUMN "duplicate_match" VARCHAR(20);
ALTER TABLE "wallet_transaction_logs" ADD COLUMN "duplicate_match" VARCHAR(20);
UPDATE "bank_transaction_logs"   SET "duplicate_match" = 'certain' WHERE "is_duplicate" = true;
UPDATE "wallet_transaction_logs" SET "duplicate_match" = 'certain' WHERE "is_duplicate" = true;

-- One expense per approved transaction.
ALTER TABLE "expenses" ADD COLUMN "source_bank_tx_id" TEXT,
                       ADD COLUMN "source_wallet_tx_id" TEXT;

UPDATE "expenses" e SET "source_bank_tx_id" = l."id"
FROM (SELECT DISTINCT ON ("created_expense_id") "id", "created_expense_id"
      FROM "bank_transaction_logs" WHERE "created_expense_id" IS NOT NULL
      ORDER BY "created_expense_id", "created_at" DESC) l
WHERE l."created_expense_id" = e."id";

UPDATE "expenses" e SET "source_wallet_tx_id" = l."id"
FROM (SELECT DISTINCT ON ("created_expense_id") "id", "created_expense_id"
      FROM "wallet_transaction_logs" WHERE "created_expense_id" IS NOT NULL
      ORDER BY "created_expense_id", "created_at" DESC) l
WHERE l."created_expense_id" = e."id" AND e."source_bank_tx_id" IS NULL;

CREATE UNIQUE INDEX "expenses_source_bank_tx_id_key"   ON "expenses"("source_bank_tx_id");
CREATE UNIQUE INDEX "expenses_source_wallet_tx_id_key" ON "expenses"("source_wallet_tx_id");

-- Balance provenance: the date a balance is true for and where it came from.
ALTER TABLE "banks"   ADD COLUMN "balance_as_of" DATE, ADD COLUMN "balance_source" VARCHAR(20), ADD COLUMN "balance_statement_id" UUID;
ALTER TABLE "wallets" ADD COLUMN "balance_as_of" DATE, ADD COLUMN "balance_source" VARCHAR(20), ADD COLUMN "balance_statement_id" UUID;

-- Existing balances: treat them as true up to the latest imported
-- transaction, so importing an older statement can't overwrite them.
UPDATE "banks" b SET "balance_as_of" = t.last_date, "balance_source" = 'statement'
FROM (SELECT s."bank_id", MAX(l."transaction_date") AS last_date
      FROM "bank_statements" s JOIN "bank_transaction_logs" l ON l."bank_statement_id" = s."id"
      GROUP BY s."bank_id") t
WHERE t."bank_id" = b."id";

UPDATE "wallets" w SET "balance_as_of" = t.last_date, "balance_source" = 'statement'
FROM (SELECT s."wallet_id", MAX(l."transaction_date") AS last_date
      FROM "wallet_statements" s JOIN "wallet_transaction_logs" l ON l."wallet_statement_id" = s."id"
      GROUP BY s."wallet_id") t
WHERE t."wallet_id" = w."id";

-- Net-worth snapshots record which definition produced them (v1 = old
-- formula with rent, no gold/assets/debt; v2 = wealth.service.js).
ALTER TABLE "networth_snapshots" ADD COLUMN "gold_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
                                 ADD COLUMN "debt_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
                                 ADD COLUMN "definition_version" VARCHAR(10) NOT NULL DEFAULT 'v1';
