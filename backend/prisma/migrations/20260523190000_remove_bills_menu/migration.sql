-- Bills/Subscriptions page removed from the sidebar — its recurring-payment
-- model overlaps too much with regular Expenses for the user's workflow.
-- The backend `/api/recurring` endpoint and `recurring_payments` table stay
-- intact so existing data isn't lost and the feature can be revived later.

DELETE FROM "menu_visibility" WHERE "path" = '/bills';
