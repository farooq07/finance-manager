-- Sidebar entry for the Gold Vault. Idempotent.
INSERT INTO "menu_visibility" ("path", "name", "icon", "visible_to_roles", "sort_order", "updated_at") VALUES
    ('/gold', 'Gold Vault', 'Gem', ARRAY['user', 'admin', 'super.admin'], 39, NOW())
ON CONFLICT ("path") DO NOTHING;
