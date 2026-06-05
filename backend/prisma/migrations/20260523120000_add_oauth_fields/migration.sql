-- OAuth identity provider fields on users.
-- Password is now nullable so accounts created via Google/Apple don't need one.

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "auth_provider" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "provider_id"   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "avatar_url"    VARCHAR(512);

-- Each (provider, provider_id) pair must be unique so we can look up an
-- existing OAuth account on subsequent sign-ins.
CREATE UNIQUE INDEX IF NOT EXISTS "users_auth_provider_provider_id_key"
  ON "users" ("auth_provider", "provider_id")
  WHERE "auth_provider" IS NOT NULL;
