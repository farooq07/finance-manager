-- Catch-up for tables that production received from `prisma db push` but no
-- migration ever created (menu_visibility, statements/transaction logs for
-- wallets, beneficiaries, AI chat, category learning). Without this the
-- migration history cannot build a fresh database: later migrations insert
-- into menu_visibility and alter the transaction logs.
--
-- Every statement is IF NOT EXISTS, so on production (where all of these
-- already exist) this migration changes nothing.

CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS "menu_visibility" (
    "path" VARCHAR(100) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "icon" VARCHAR(40) NOT NULL,
    "visible_to_roles" TEXT[] DEFAULT ARRAY['user', 'admin', 'super.admin']::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "parent_path" VARCHAR(100),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_visibility_pkey" PRIMARY KEY ("path")
);

CREATE TABLE IF NOT EXISTS "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "tool_name" VARCHAR(100),
    "tool_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "chat_documents" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "char_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(3072),

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wallet_statements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "month" VARCHAR(20) NOT NULL,
    "year" INTEGER NOT NULL,
    "file_path" TEXT,
    "file_hash" VARCHAR(64),
    "password_encrypted" TEXT,
    "upload_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactions" JSONB,
    "opening_balance" DECIMAL(15,2),
    "closing_balance" DECIMAL(15,2),
    "total_credits" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_debits" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "transaction_count" INTEGER NOT NULL DEFAULT 0,
    "processing_status" VARCHAR(50) NOT NULL DEFAULT 'pending',

    CONSTRAINT "wallet_statements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wallet_transaction_logs" (
    "id" TEXT NOT NULL,
    "wallet_statement_id" UUID NOT NULL,
    "transaction_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "debit_amount" DECIMAL(15,2),
    "credit_amount" DECIMAL(15,2),
    "net_amount" DECIMAL(15,2) NOT NULL,
    "suggested_category" VARCHAR(100),
    "category_confidence" DECIMAL(3,2),
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicate_of_id" UUID,
    "user_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_category" VARCHAR(100),
    "created_expense_id" UUID,
    "notes" TEXT,
    "processing_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transaction_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "bank_transaction_logs" (
    "id" TEXT NOT NULL,
    "bank_statement_id" UUID NOT NULL,
    "transaction_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "debit_amount" DECIMAL(15,2),
    "credit_amount" DECIMAL(15,2),
    "net_amount" DECIMAL(15,2) NOT NULL,
    "suggested_category" VARCHAR(100),
    "category_confidence" DECIMAL(3,2),
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicate_of_id" UUID,
    "user_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_category" VARCHAR(100),
    "created_expense_id" UUID,
    "notes" TEXT,
    "processing_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transaction_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "category_patterns" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "keyword" VARCHAR(100) NOT NULL,
    "assigned_category" VARCHAR(100) NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "last_used" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_patterns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "category_cache" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'ai',
    "confidence" DECIMAL(3,2) NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "last_used" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_cache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "beneficiaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nickname" VARCHAR(100),
    "phone" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "beneficiary_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiary_id" UUID NOT NULL,
    "account_label" VARCHAR(100),
    "account_no" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "beneficiary_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiary_id" UUID NOT NULL,
    "bank_transaction_id" TEXT,
    "wallet_transaction_id" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "menu_visibility_parent_path_idx" ON "menu_visibility"("parent_path");

CREATE INDEX IF NOT EXISTS "document_chunks_document_id_idx" ON "document_chunks"("document_id");

CREATE INDEX IF NOT EXISTS "wallet_transaction_logs_wallet_statement_id_idx" ON "wallet_transaction_logs"("wallet_statement_id");

CREATE INDEX IF NOT EXISTS "wallet_transaction_logs_user_approved_idx" ON "wallet_transaction_logs"("user_approved");

CREATE INDEX IF NOT EXISTS "wallet_transaction_logs_processing_status_idx" ON "wallet_transaction_logs"("processing_status");

CREATE INDEX IF NOT EXISTS "bank_transaction_logs_bank_statement_id_idx" ON "bank_transaction_logs"("bank_statement_id");

CREATE INDEX IF NOT EXISTS "bank_transaction_logs_user_approved_idx" ON "bank_transaction_logs"("user_approved");

CREATE INDEX IF NOT EXISTS "bank_transaction_logs_processing_status_idx" ON "bank_transaction_logs"("processing_status");

CREATE UNIQUE INDEX IF NOT EXISTS "category_patterns_user_id_keyword_assigned_category_key" ON "category_patterns"("user_id", "keyword", "assigned_category");

CREATE UNIQUE INDEX IF NOT EXISTS "category_cache_user_id_description_key" ON "category_cache"("user_id", "description");

CREATE UNIQUE INDEX IF NOT EXISTS "beneficiary_transactions_beneficiary_id_bank_transaction_id_key" ON "beneficiary_transactions"("beneficiary_id", "bank_transaction_id");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_sessions_user_id_fkey') THEN
        ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_session_id_fkey') THEN
        ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_documents_user_id_fkey') THEN
        ALTER TABLE "chat_documents" ADD CONSTRAINT "chat_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_chunks_document_id_fkey') THEN
        ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "chat_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_statements_wallet_id_fkey') THEN
        ALTER TABLE "wallet_statements" ADD CONSTRAINT "wallet_statements_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transaction_logs_wallet_statement_id_fkey') THEN
        ALTER TABLE "wallet_transaction_logs" ADD CONSTRAINT "wallet_transaction_logs_wallet_statement_id_fkey" FOREIGN KEY ("wallet_statement_id") REFERENCES "wallet_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_transaction_logs_bank_statement_id_fkey') THEN
        ALTER TABLE "bank_transaction_logs" ADD CONSTRAINT "bank_transaction_logs_bank_statement_id_fkey" FOREIGN KEY ("bank_statement_id") REFERENCES "bank_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_patterns_user_id_fkey') THEN
        ALTER TABLE "category_patterns" ADD CONSTRAINT "category_patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_cache_user_id_fkey') THEN
        ALTER TABLE "category_cache" ADD CONSTRAINT "category_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beneficiaries_user_id_fkey') THEN
        ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beneficiary_accounts_beneficiary_id_fkey') THEN
        ALTER TABLE "beneficiary_accounts" ADD CONSTRAINT "beneficiary_accounts_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beneficiary_transactions_beneficiary_id_fkey') THEN
        ALTER TABLE "beneficiary_transactions" ADD CONSTRAINT "beneficiary_transactions_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
