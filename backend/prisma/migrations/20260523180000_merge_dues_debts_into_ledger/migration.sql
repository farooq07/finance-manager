-- Dues Ledger and Debts pages were merged into a single "Ledger" screen.
-- Remove the two old menu entries and seed the new one. The /dues and /debts
-- routes still work (the frontend redirects them to /ledger with the right tab),
-- but they're no longer listed in the sidebar.

DELETE FROM "menu_visibility" WHERE "path" IN ('/dues', '/debts');

INSERT INTO "menu_visibility" ("name", "path", "icon", "sort_order", "visible_to_roles", "updated_at")
VALUES ('Ledger', '/ledger', 'Scale', 36, ARRAY['user', 'admin', 'super.admin']::text[], NOW())
ON CONFLICT ("path") DO UPDATE SET
    "name" = EXCLUDED."name",
    "icon" = EXCLUDED."icon",
    "visible_to_roles" = EXCLUDED."visible_to_roles",
    "updated_at" = NOW();
