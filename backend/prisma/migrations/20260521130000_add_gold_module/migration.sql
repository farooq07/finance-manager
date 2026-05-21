-- Gold Vault: tracked items, daily price snapshots, second-factor PIN.

CREATE TABLE "gold_items" (
    "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
    "user_id"       UUID            NOT NULL,
    "name"          VARCHAR(255)    NOT NULL,
    "type"          VARCHAR(20)     NOT NULL,
    "weight_grams"  DECIMAL(10, 3)  NOT NULL,
    "carats"        INTEGER         NOT NULL DEFAULT 20,
    "purchase_date" DATE,
    "notes"         TEXT,
    "created_at"    TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),

    CONSTRAINT "gold_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gold_items_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "gold_items_user_id_idx" ON "gold_items" ("user_id");

CREATE TABLE "gold_price_history" (
    "id"                 UUID            NOT NULL DEFAULT gen_random_uuid(),
    "date"               DATE            NOT NULL,
    "price_24k_per_tola" DECIMAL(12, 2)  NOT NULL,
    "price_24k_per_gram" DECIMAL(12, 2)  NOT NULL,
    "source"             VARCHAR(32)     NOT NULL DEFAULT 'hamariweb',
    "created_at"         TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),

    CONSTRAINT "gold_price_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gold_price_history_date_key" UNIQUE ("date")
);

CREATE INDEX "gold_price_history_date_idx" ON "gold_price_history" ("date");

CREATE TABLE "gold_pins" (
    "id"         UUID            NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID            NOT NULL,
    "pin_hash"   VARCHAR(255)    NOT NULL,
    "created_at" TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6)  NOT NULL DEFAULT NOW(),

    CONSTRAINT "gold_pins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gold_pins_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "gold_pins_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
