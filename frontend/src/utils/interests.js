// What a user can choose to track. Each interest unlocks one menu path;
// every other path is core and always shown. Keys must match
// backend/src/constants/interests.js.
export const INTERESTS = [
    { key: 'stocks', label: 'Stocks (PSX)', description: 'Shares, dividends and your watchlist', path: '/stocks' },
    { key: 'mutual-funds', label: 'Mutual funds', description: 'Fund units and their current value', path: '/mutual-funds' },
    { key: 'ledger', label: 'Money lent / borrowed', description: 'Who owes you, who you owe, and loans', path: '/ledger' },
    { key: 'rent', label: 'Rental income', description: 'Rent received from tenants', path: '/personal#rent' },
    { key: 'gold', label: 'Gold', description: 'Jewellery and gold by weight and karat', path: '/personal#gold' },
    { key: 'assets', label: 'Property & other assets', description: 'Plots, cars and other things you own', path: '/personal#assets' },
];

const INTEREST_BY_PATH = Object.fromEntries(INTERESTS.map((i) => [i.path, i.key]));

/** The interest key that unlocks `path`, or undefined for a core path. */
export const interestForPath = (path) => INTEREST_BY_PATH[path];
