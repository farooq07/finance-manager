-- The Dashboard now includes the full net-worth view (hero + history chart
-- + composition strip + asset allocation). The dedicated /net-worth entry
-- duplicates the Dashboard — remove it from the sidebar.
-- The /net-worth route still resolves (it renders Dashboard) so old links work.
DELETE FROM "menu_visibility" WHERE "path" = '/net-worth';
