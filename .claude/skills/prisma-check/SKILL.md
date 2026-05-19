# /prisma-check

Compare the local Prisma schema against the actual database state and report any drift. Never auto-push.

## Steps

1. Read `backend/prisma/schema.prisma` to understand the current local schema.

2. Check for pending migrations (changes in schema not yet applied to DB):
   ```bash
   cd backend && npx prisma migrate status
   ```

3. Check for schema drift (DB has changes not in schema):
   ```bash
   cd backend && npx prisma db pull --print 2>&1
   ```
   Compare the output against the current `schema.prisma`. Any differences = drift.

4. Check for unapplied migrations:
   If `migrate status` shows "have not yet been applied", list them by name.

5. Report the findings:
   - **In sync**: schema matches DB, all migrations applied
   - **Pending migrations**: list migration names not yet applied to DB
   - **Schema drift**: list fields/models in DB that are not in `schema.prisma`
   - **Diverged**: both pending migrations AND drift exist — needs manual resolution

6. **Never run `prisma db push` or `prisma migrate deploy` automatically.** Always stop and tell the user what needs to happen next.

## After checking

If there are pending migrations, the recommended command is:
```bash
cd backend && npx prisma migrate deploy
```

If there is drift, the user must resolve it manually by updating `schema.prisma` to match the DB (or vice versa) before running migrations.

## Important

- `DATABASE_URL` (pooled) may not work for schema introspection — `DIRECT_URL` is needed
- If the command fails with a connection error, remind the user to check that `DIRECT_URL` is set in `backend/.env`
