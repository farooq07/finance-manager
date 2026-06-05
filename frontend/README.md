# FSWealth Axis — Frontend

React 19 + Vite frontend for FSWealth Axis. See the [root README](../README.md) for full project documentation.

## Dev

```bash
npm install
npm run dev        # http://localhost:5173
```

## Tests

```bash
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright E2E (requires backend running on :5000)
```

## Key files

| Path | Purpose |
|---|---|
| `src/utils/currency.js` | `fmtPKR()` — always use for PKR amounts |
| `src/utils/dates.js` | `fmtDateLong()` |
| `src/services/api.js` | Axios instance with JWT interceptor |
| `src/components/Sidebar.jsx` | Sidebar menu (reads from `menu_visibility` DB table) |
| `src/App.jsx` | All routes |
| `e2e/fixtures/auth.js` | JWT injection for Playwright tests |
