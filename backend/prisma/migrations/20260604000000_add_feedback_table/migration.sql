-- Feedback table: users can submit bug reports, feature requests, and questions.
-- Admins can read all rows and update status.
CREATE TABLE "feedback" (
    "id"          UUID            NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     UUID            NOT NULL,
    "type"        VARCHAR(20)     NOT NULL,
    "title"       VARCHAR(200)    NOT NULL,
    "description" TEXT            NOT NULL,
    "screenshot"  TEXT,
    "status"      VARCHAR(20)     NOT NULL DEFAULT 'open',
    "created_at"  TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feedback_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "feedback_user_id_idx" ON "feedback" ("user_id");
CREATE INDEX "feedback_status_idx"  ON "feedback" ("status");

-- Add Help & Feedback to the sidebar (Tools section, after Settings)
INSERT INTO "menu_visibility" ("path", "name", "icon", "visible_to_roles", "sort_order", "updated_at")
VALUES ('/help', 'Help & Feedback', 'LifeBuoy', ARRAY['user', 'admin', 'super.admin'], 95, NOW())
ON CONFLICT ("path") DO NOTHING;
