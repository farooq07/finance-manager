-- Soft delete for users. Admins "request" deletion (deactivates login);
-- super.admin reviews the request and either restores or hard-deletes.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "deleted_at"            TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "deletion_requested_by" UUID,
  ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMPTZ(6);

-- Speeds up the "active users" filter (deleted_at IS NULL) and the
-- super.admin review query (deleted_at IS NOT NULL).
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" ("deleted_at");
