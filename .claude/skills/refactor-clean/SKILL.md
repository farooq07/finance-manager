# /refactor-clean

Find and report code quality issues across the codebase. Report first, then ask before deleting anything.

## What to scan

### 1. console.log statements
```bash
grep -r "console\.log" backend/src frontend/src --include="*.js" --include="*.jsx" -l
```
Flag all `console.log` in production code paths. `console.error` is acceptable for caught errors.

### 2. Unused imports
Scan `frontend/src/**/*.{js,jsx}` for imports that are declared but never referenced in the file body.

### 3. TODO / FIXME comments
```bash
grep -r "TODO\|FIXME\|HACK\|XXX" backend/src frontend/src --include="*.js" --include="*.jsx" -n
```

### 4. Stale .md files
Check for markdown files outside of `.claude/` that describe features not yet implemented or already removed.

### 5. Dead routes
Check `App.jsx` for `<Route>` entries pointing to pages that no longer exist in `frontend/src/pages/`.

### 6. Duplicate menu_visibility entries
```bash
# Check for duplicate sort_order values in menu_visibility
```
(Run via Prisma or direct DB query.)

## Output format

For each category, list:
- File path + line number
- The offending code
- Recommended action (delete / convert to console.error / resolve TODO)

**Do not delete or edit anything without user confirmation.**

After reporting, ask: "Which of these would you like me to clean up?"
