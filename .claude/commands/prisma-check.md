---
description: Compare local Prisma schema against the database and report any drift. Never auto-pushes.
allowed-tools: Read, Bash
---

Check whether the local Prisma schema is in sync with the database. Never run `prisma db push` or `prisma migrate deploy` automatically.

## Steps

1. Read `backend/prisma/schema.prisma` to understand the current local schema.

2. Check migration status (pending migrations not yet applied to DB):
   ```bash
   cd backend && doppler run -- npx prisma migrate status 2>&1
   ```

3. Check for schema drift (DB has columns/tables not in schema.prisma):
   ```bash
   cd backend && doppler run -- npx prisma db pull --print 2>&1
   ```
   Compare the output against the current `schema.prisma`. Any extra fields or models = drift.

4. Classify the result:

   - **In sync** — schema matches DB, all migrations applied. Safe to deploy.
   - **Pending migrations** — local migration files exist that haven't been applied to DB. Run `prisma migrate deploy` to apply.
   - **Schema drift** — DB has fields/tables not in `schema.prisma`. Must update schema manually before migrating.
   - **Diverged** — both pending migrations AND drift. Needs manual resolution before proceeding.

5. Report findings clearly. If there are issues, tell the user exactly what command to run next (but don't run it automatically).

## Never do

- Never run `prisma db push` (skips migration history, can cause drift in production)
- Never run `prisma migrate deploy` without showing the user what will be applied first
- Never run `prisma migrate dev` in production environments

## Connection note

If commands fail with a connection error, remind the user that:
- Prisma commands get `DATABASE_URL` / `DIRECT_URL` from Doppler (`doppler run --`); there is no `backend/.env`
- `DIRECT_URL` must be set in the Doppler config for introspection (pooled Supabase URLs don't work for migrations)
- Check: `cd backend && doppler secrets --only-names | grep DIRECT_URL`
