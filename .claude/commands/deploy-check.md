---
description: Full pre-deployment checklist — env vars, build, tests, schema sync, no console.logs, clean git.
allowed-tools: Read, Grep, Glob, Bash
---

Run a complete pre-deployment checklist before pushing to main. Report PASS / FAIL / WARN for each item.

## Checklist

### 1. Uncommitted changes
```bash
git status --short 2>&1
```
PASS if working tree is clean. FAIL if there are uncommitted changes.

### 2. Schema sync
```bash
cd backend && npx prisma migrate status 2>&1
```
PASS if all migrations are applied. FAIL if there are pending migrations.

### 3. Frontend build
```bash
cd frontend && npm run build 2>&1 | tail -20
```
PASS if build exits 0 with no errors. FAIL on any TypeScript or Vite build error.

### 4. Unit tests
```bash
cd frontend && npm run test -- --run 2>&1 | tail -15
```
PASS if all Vitest tests pass. FAIL on any test failure.

### 5. console.log check
```bash
grep -r "console\.log" backend/src frontend/src --include="*.js" --include="*.jsx" -l 2>&1
```
PASS if no files found. WARN for each file containing `console.log`.

### 6. Hardcoded PKR strings
```bash
grep -r '"PKR"\|'\''PKR'\''' frontend/src --include="*.jsx" --include="*.js" -l 2>&1
```
WARN for any file outside `currency.js` that hardcodes "PKR".

### 7. Environment variables reminder (manual check)
Print a reminder — these cannot be verified programmatically:
- Vercel dashboard: `VITE_API_URL` must be `https://finance-manager-production-73ad.up.railway.app/api`
- Railway service vars: `JWT_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `FRONTEND_URL`, `GEMINI_API_KEY`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

### 8. E2E tests (optional — requires dev servers)
Check if frontend :5173 is reachable. If yes:
```bash
cd frontend && npx playwright test --reporter=list 2>&1 | tail -20
```
PASS if all green. WARN if servers not detected (skip, don't fail).

## Output format

```
[ PASS ] Git working tree is clean
[ PASS ] All Prisma migrations applied
[ PASS ] Frontend build succeeds
[ PASS ] All Vitest unit tests pass
[ WARN ] console.log found in: backend/src/controllers/bank.controller.js
[ PASS ] No hardcoded PKR strings
[ INFO ] Manually verify env vars in Vercel and Railway dashboards before deploying
[ WARN ] E2E tests skipped — dev servers not detected
```

If any FAIL items exist, stop and tell the user to resolve them before pushing. Do not push automatically.
