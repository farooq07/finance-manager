---
description: Scan for console.logs, unused imports, TODOs, dead routes, and stale files. Report before deleting anything.
allowed-tools: Read, Grep, Glob, Bash
---

Scan the codebase for code quality issues and report them. Do not delete or edit anything without explicit user confirmation.

## Scans to run

### 1. console.log statements
```bash
grep -r "console\.log" backend/src frontend/src --include="*.js" --include="*.jsx" -n 2>&1
```
Flag all `console.log` in production paths. `console.error` on caught errors is acceptable.

### 2. Unused imports
Read each file in `frontend/src/**/*.{js,jsx}` and check if every imported name is referenced in the file body. List files with declared-but-unreferenced imports.

### 3. TODO / FIXME / HACK comments
```bash
grep -r "TODO\|FIXME\|HACK\|XXX" backend/src frontend/src --include="*.js" --include="*.jsx" -n 2>&1
```

### 4. Dead routes in App.jsx
Read `frontend/src/App.jsx`. For each `<Route path="..." element={<PageComponent />} />`, verify the component file exists in `frontend/src/pages/`. List any routes pointing to missing files.

### 5. Stale markdown files
List `.md` files in the project root and `docs/` (if it exists). Flag any that describe unimplemented features or reference removed code.

### 6. Hardcoded "PKR" currency strings
```bash
grep -r '"PKR"\|'\''PKR'\''\|Rs\.' frontend/src --include="*.jsx" --include="*.js" -n 2>&1
```
Flag any that aren't inside `currency.js` itself.

## Output format

For each category, output:
```
### console.log statements
- backend/src/controllers/bank.controller.js:47 — console.log('bank data:', data)
- frontend/src/pages/Expenses.jsx:112 — console.log(expenses)

### Unused imports
(none found)

### TODO comments
- frontend/src/components/ChatWindow.jsx:34 — // TODO: add scroll-to-bottom on new message
```

After the full report, ask: "Which of these would you like me to clean up?"

Do NOT make any edits until the user responds.
