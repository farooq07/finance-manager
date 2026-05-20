-- Add legal acceptance tracking to users.
ALTER TABLE "users" ADD COLUMN "terms_accepted_at"   TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "privacy_accepted_at" TIMESTAMPTZ(6);

-- Grandfather pre-existing accounts: implicit acceptance at registration time.
-- When ToS/Privacy materially change later, add a "policy_version" column and
-- bump it to force re-acceptance.
UPDATE "users"
SET    "terms_accepted_at"   = "created_at",
       "privacy_accepted_at" = "created_at"
WHERE  "terms_accepted_at"   IS NULL
   OR  "privacy_accepted_at" IS NULL;
