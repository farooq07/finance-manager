# Finance App Conventions

## Currency formatting

Always use `fmtPKR()` from `frontend/src/utils/currency.js` for displaying monetary amounts.

Never hardcode currency strings like `"PKR"`, `"Rs."`, or raw number formatting.

**Why:** Users are Pakistani; amounts are always PKR. The util handles comma formatting and edge cases consistently across the app.

**How to apply:** Grep for hardcoded "PKR" strings in JSX/JS files outside of `currency.js` itself.

## Date formatting

Use `fmtDateLong()` from `frontend/src/utils/dates.js` for human-readable dates in the UI.

## Dark mode

Every new UI component must include `dark:` Tailwind variants alongside light-mode classes.

**Why:** The app ships a full dark mode; components without dark variants break the theme.

**How to apply:** When writing new JSX, pair every `bg-white`, `text-gray-900`, `border-gray-200`, etc. with its `dark:` equivalent.

## Sidebar menu items

When adding a new page/route, three things must all happen together:
1. Add the route in `frontend/src/App.jsx`
2. Add the menu item in `frontend/src/components/Sidebar.jsx`
3. Insert a row into the `menu_visibility` DB table

**Why:** The sidebar visibility system reads from the DB — a missing row means admins cannot control the item's visibility per user.

**How to apply:** After adding a route, always run the menu_visibility insert. See `backend/src/controllers/settings.controller.js` for the pattern.

## Tab pages

Pages that combine multiple sub-pages (e.g. Personal = Zakat + Rent + Assets) use URL search params for tab state:

```jsx
const [searchParams, setSearchParams] = useSearchParams();
const active = searchParams.get('tab') || 'default-tab';
```

This lets tab state survive browser navigation and allows deep-linking to a specific tab.
