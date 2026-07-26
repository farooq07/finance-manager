-- Seed every existing user's watchlist with the 14 tickers that used to be
-- hardcoded in Stocks.jsx, so nobody loses the list they were used to seeing.
-- New users start with an empty watchlist and add their own.
--
-- ON CONFLICT DO NOTHING makes this safe to re-run.

INSERT INTO "watchlist" ("user_id", "ticker")
SELECT u."id", t."ticker"
FROM "users" u
CROSS JOIN (
    VALUES ('FFC'), ('FFL'), ('HUBC'), ('MEBL'), ('OGDC'), ('EFERT'), ('FATIMA'),
           ('LUCK'), ('MARI'), ('MTL'), ('NATF'), ('PPL'), ('PSO'), ('SYS')
) AS t("ticker")
WHERE u."deleted_at" IS NULL
ON CONFLICT ("user_id", "ticker") DO NOTHING;
