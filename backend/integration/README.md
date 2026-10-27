# Integration tests

Whole money journeys (import → reconcile → approve → report → export, with
repeat requests and cross-user access) against a real, freshly migrated
Postgres. They never use the real database: `setup.js` refuses any host but
localhost.

```bash
# any disposable local Postgres with pgvector, e.g. docker:
docker run -d --rm -p 5433:5432 -e POSTGRES_PASSWORD=it pgvector/pgvector:pg16
export INTEGRATION_DATABASE_URL=postgresql://postgres:it@127.0.0.1:5433/postgres
DATABASE_URL=$INTEGRATION_DATABASE_URL DIRECT_URL=$INTEGRATION_DATABASE_URL npx prisma migrate deploy
npm run test:integration
```

CI runs them in the `migrations` job (see `.github/workflows/ci.yml`).
Each run starts by emptying the database.
