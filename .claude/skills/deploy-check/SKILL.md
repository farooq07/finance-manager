# /deploy-check

Run a pre-deployment checklist before pushing to main. Report pass/fail for each item.

## Checklist

### 1. Environment variables — Vercel (Frontend)
Verify these are set in Vercel dashboard (cannot be checked programmatically — remind user to confirm):
- [ ] `VITE_API_URL` — must be the Railway public URL ending in `/api`

### 2. Environment variables — Railway (Backend)
Verify these exist in `backend/.env` (or Railway service vars):
- [ ] `JWT_SECRET` — must be set and non-empty
- [ ] `DATABASE_URL` — pooled Supabase URL
- [ ] `DIRECT_URL` — direct Supabase URL for migrations
- [ ] `FRONTEND_URL` — Vercel deployment URL (for CORS)
- [ ] `GEMINI_API_KEY` — for AI categoriser and RAG
- [ ] `SMTP_*` vars — for OTP and verification emails

Check which are present (without printing values):
```bash
cd backend && node -e "
const vars = ['JWT_SECRET','DATABASE_URL','DIRECT_URL','FRONTEND_URL','GEMINI_API_KEY','SMTP_HOST'];
vars.forEach(v => console.log(v + ': ' + (process.env[v] ? 'SET' : 'MISSING')));
"
```

### 3. Schema sync
Run `/prisma-check` — schema must be in sync with DB before deploying.

### 4. Build check
```bash
cd frontend && npm run build 2>&1 | tail -20
```
Must complete with no errors.

### 5. Unit tests
```bash
cd frontend && npm run test -- --run 2>&1 | tail -10
```
All Vitest tests must pass.

### 6. E2E tests
```bash
cd frontend && npx playwright test --reporter=list 2>&1 | tail -20
```
All Playwright tests must pass (requires both dev servers running).

### 7. console.log check
```bash
grep -r "console\.log" backend/src frontend/src --include="*.js" --include="*.jsx" -l 2>&1
```
Report any files with console.log in production code paths.

### 8. Uncommitted changes
```bash
git status --short
```
Must be clean before deploying.

## Output format

```
[ PASS ] VITE_API_URL set
[ PASS ] Build succeeds
[ FAIL ] 3 console.log statements found — see: backend/src/controllers/bank.controller.js
[ WARN ] E2E tests not run (dev servers not detected)
```

Flag any FAIL items and ask the user to resolve them before pushing.
