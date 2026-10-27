-- Indexes for the paths every money screen takes: ownership joins
-- (statement -> account -> user) and date-range filters.
CREATE INDEX IF NOT EXISTS "expenses_user_id_expense_date_idx" ON "expenses"("user_id", "expense_date");
CREATE INDEX IF NOT EXISTS "bank_statements_bank_id_idx" ON "bank_statements"("bank_id");
CREATE INDEX IF NOT EXISTS "wallet_statements_wallet_id_idx" ON "wallet_statements"("wallet_id");
CREATE INDEX IF NOT EXISTS "bank_transaction_logs_transaction_date_idx" ON "bank_transaction_logs"("transaction_date");
CREATE INDEX IF NOT EXISTS "wallet_transaction_logs_transaction_date_idx" ON "wallet_transaction_logs"("transaction_date");
CREATE INDEX IF NOT EXISTS "banks_user_id_idx" ON "banks"("user_id");
CREATE INDEX IF NOT EXISTS "wallets_user_id_idx" ON "wallets"("user_id");
CREATE INDEX IF NOT EXISTS "dues_transactions_user_id_idx" ON "dues_transactions"("user_id");
CREATE INDEX IF NOT EXISTS "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");
