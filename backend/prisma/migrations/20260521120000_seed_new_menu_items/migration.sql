-- Idempotent seed of menu_visibility rows for the new before-selling-v1 pages.
-- Sidebar reads from this table; without a row, the link doesn't appear at all.
-- The icon column matches a key in frontend/src/components/Sidebar.jsx ICONS map.

INSERT INTO "menu_visibility" ("path", "name", "icon", "visible_to_roles", "sort_order", "updated_at") VALUES
    ('/insights',  'Insights',  'BarChart2',   ARRAY['user', 'admin', 'super.admin'], 35, NOW()),
    ('/net-worth', 'Net Worth', 'TrendingUp',  ARRAY['user', 'admin', 'super.admin'], 36, NOW()),
    ('/bills',     'Bills',     'Receipt',     ARRAY['user', 'admin', 'super.admin'], 37, NOW()),
    ('/debts',     'Debts',     'CreditCard',  ARRAY['user', 'admin', 'super.admin'], 38, NOW())
ON CONFLICT ("path") DO NOTHING;
