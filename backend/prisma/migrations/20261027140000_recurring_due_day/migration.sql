-- Recurring payments remember the intended day of the month, so a payment on
-- the 31st falls on the last day of shorter months instead of skipping ahead.
ALTER TABLE "recurring_payments" ADD COLUMN "due_day" INTEGER;
UPDATE "recurring_payments" SET "due_day" = EXTRACT(DAY FROM "next_due_date")::int;
