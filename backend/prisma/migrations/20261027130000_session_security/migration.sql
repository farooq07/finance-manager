-- One-time codes: stored as sha256 hex, tied to a purpose, attempt-limited.
ALTER TABLE "users" ALTER COLUMN "otp_code" TYPE VARCHAR(64);
-- Any code issued before this deploy was plain text; void it.
UPDATE "users" SET "otp_code" = NULL, "otp_expires_at" = NULL WHERE "otp_code" IS NOT NULL;
ALTER TABLE "users" ADD COLUMN "otp_purpose" VARCHAR(20),
                    ADD COLUMN "otp_attempts" INTEGER NOT NULL DEFAULT 0,
                    ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
                    ADD COLUMN "locked_until" TIMESTAMPTZ(6),
                    ADD COLUMN "pin_failed_attempts" INTEGER NOT NULL DEFAULT 0,
                    ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

-- Deactivated accounts lose every existing session immediately.
UPDATE "users" SET "token_version" = 1 WHERE "deleted_at" IS NOT NULL;

ALTER TABLE "gold_pins" ADD COLUMN "failed_attempts" INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN "locked_until" TIMESTAMPTZ(6);
