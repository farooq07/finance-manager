-- /insights and /expenses now render the same merged Spending page.
-- Remove the duplicate sidebar entry so users only see one link.
-- The /insights route still works (App.jsx maps it to the same component),
-- so any existing bookmark continues to function.
DELETE FROM "menu_visibility" WHERE "path" = '/insights';
