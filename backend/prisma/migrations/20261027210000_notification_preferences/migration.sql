-- Which emails each user agreed to receive.
ALTER TABLE "users" ADD COLUMN "notify_weekly_summary" BOOLEAN NOT NULL DEFAULT true,
                    ADD COLUMN "notify_bill_reminders" BOOLEAN NOT NULL DEFAULT true;
