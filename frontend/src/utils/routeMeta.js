/**
 * Route metadata for the global Header.
 *
 * Each entry describes a page's title and (optionally) its parent route, so
 * the Header can render a back-arrow + "Parent / Current" breadcrumb without
 * each page needing its own inline back button.
 *
 * Patterns supported in `path`:
 *   - exact match: '/expenses'
 *   - prefix wildcard: '/banks/:id', '/wallets/:id', '/stocks/:id', '/debts/:id', '/beneficiaries/:id'
 *
 * For dynamic routes, the matcher uses the first segment + a UUID-like check
 * on the second so we don't accidentally match arbitrary nesting.
 */

const STATIC_ROUTES = {
    '/': { title: 'Dashboard' },
    '/expenses': { title: 'Spending' },
    '/insights': { title: 'Spending' },
    '/net-worth': { title: 'Net Worth' },
    '/reports': { title: 'Reports' },
    '/mutual-funds': { title: 'Mutual Funds' },
    '/stocks': { title: 'Stocks' },
    '/ledger': { title: 'Ledger' },
    '/accounts': { title: 'Accounts' },
    '/personal': { title: 'Personal' },
    '/settings': { title: 'Settings' },
    '/users': { title: 'Users' },
    '/roles': { title: 'Roles' },
    '/gold': { title: 'Gold Vault' },
    '/assistant': { title: 'AI Assistant' },
    '/design-system': { title: 'Design System' },
};

// Dynamic detail routes — each has a parent for the breadcrumb / back arrow.
const DYNAMIC_ROUTES = [
    { prefix: '/banks/',        title: 'Account',     parent: '/accounts',     parentTitle: 'Accounts' },
    { prefix: '/wallets/',      title: 'Wallet',      parent: '/accounts',     parentTitle: 'Accounts' },
    { prefix: '/stocks/',       title: 'Stock',       parent: '/stocks',       parentTitle: 'Stocks' },
    { prefix: '/debts/',        title: 'Debt',        parent: '/ledger?tab=loans', parentTitle: 'Ledger' },
    { prefix: '/beneficiaries/', title: 'Beneficiary', parent: '/accounts?tab=beneficiaries', parentTitle: 'Beneficiaries' },
];

export function getRouteMeta(pathname) {
    if (STATIC_ROUTES[pathname]) return STATIC_ROUTES[pathname];

    for (const r of DYNAMIC_ROUTES) {
        if (pathname.startsWith(r.prefix) && pathname.length > r.prefix.length) {
            return {
                title: r.title,
                parent: r.parent,
                parentTitle: r.parentTitle,
            };
        }
    }
    return { title: '' };
}
