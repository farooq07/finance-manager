-- First-run onboarding: when the user finished it, and what they track.
ALTER TABLE "users" ADD COLUMN "onboarded_at" TIMESTAMPTZ(6),
                    ADD COLUMN "interests" JSONB;

-- Existing users are already set up: never send them to onboarding.
UPDATE "users" SET "onboarded_at" = now() WHERE "onboarded_at" IS NULL;
