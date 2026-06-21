-- Sub-section visibility. Adds a parent_path so menu_visibility can hold
-- per-role rows for tabs inside a page (Personal tabs, Reports sections).
-- Sub-rows are filtered out of the sidebar and gate page tabs instead.

ALTER TABLE "menu_visibility" ADD COLUMN IF NOT EXISTS "parent_path" VARCHAR(100);

CREATE INDEX IF NOT EXISTS "menu_visibility_parent_path_idx" ON "menu_visibility" ("parent_path");

-- Seed sub-section rows (default: visible to all roles). Idempotent.
INSERT INTO "menu_visibility" (path, name, icon, visible_to_roles, sort_order, parent_path, updated_at)
VALUES
  ('/personal#zakat',         'Zakat',              'HeartHandshake', ARRAY['user','admin','super.admin'], 10, '/personal', NOW()),
  ('/personal#rent',          'Rent',               'Building',       ARRAY['user','admin','super.admin'], 11, '/personal', NOW()),
  ('/personal#assets',        'Assets',             'Box',            ARRAY['user','admin','super.admin'], 12, '/personal', NOW()),
  ('/personal#gold',          'Gold',               'Gem',            ARRAY['user','admin','super.admin'], 13, '/personal', NOW()),
  ('/reports#transactions',   'Transaction Log',    'FileText',       ARRAY['user','admin','super.admin'], 20, '/reports', NOW()),
  ('/reports#categories',     'Category Breakdown', 'BarChart2',      ARRAY['user','admin','super.admin'], 21, '/reports', NOW()),
  ('/reports#annual',         'Annual Summary',     'TrendingUp',     ARRAY['user','admin','super.admin'], 22, '/reports', NOW())
ON CONFLICT (path) DO NOTHING;
