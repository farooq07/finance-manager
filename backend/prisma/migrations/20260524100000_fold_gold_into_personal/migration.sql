-- Gold Vault moved into Personal as a tab (alongside Zakat, Rent, Assets).
-- The /gold route still works (App.jsx redirects it to /personal?tab=gold), so
-- old bookmarks and notification links keep working — but it no longer appears
-- as a standalone sidebar item.

DELETE FROM "menu_visibility" WHERE "path" = '/gold';
