-- Expo push tokens: one row per phone, owned by whoever signed in on it last.
-- Idempotent so it is safe to re-run.

CREATE TABLE IF NOT EXISTS "push_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "platform" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_tokens_token_key" ON "push_tokens"("token");
CREATE INDEX IF NOT EXISTS "push_tokens_user_id_idx" ON "push_tokens"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_tokens_user_id_fkey') THEN
        ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
