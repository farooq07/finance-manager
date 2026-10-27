-- Uploaded-but-not-yet-imported statement files, bound to their owner.
CREATE TABLE "upload_sessions" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"      UUID NOT NULL,
    "kind"         VARCHAR(10) NOT NULL,
    "account_id"   UUID NOT NULL,
    "file_path"    TEXT NOT NULL,
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at"   TIMESTAMPTZ(6) NOT NULL,
    "committed_at" TIMESTAMPTZ(6),
    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "upload_sessions_user_id_idx" ON "upload_sessions"("user_id");
CREATE INDEX "upload_sessions_expires_at_idx" ON "upload_sessions"("expires_at");
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
