-- Beneficiaries moved into Accounts as a tab.
-- The /beneficiaries route still works (App.jsx redirects to /accounts?tab=beneficiaries),
-- but the standalone sidebar entry is gone.

DELETE FROM "menu_visibility" WHERE "path" = '/beneficiaries';
