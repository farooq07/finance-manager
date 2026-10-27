// What a user can choose to track. Each interest unlocks one menu path; every
// other path is core. Keys and labels must match the web
// (frontend/src/utils/interests.js) and backend/src/constants/interests.js.
export type InterestKey = 'stocks' | 'mutual-funds' | 'ledger' | 'rent' | 'gold' | 'assets';

export type Interest = { key: InterestKey; label: string; description: string; path: string };

export const INTERESTS: Interest[] = [
    { key: 'stocks', label: 'Stocks (PSX)', description: 'Shares, dividends and your watchlist', path: '/stocks' },
    { key: 'mutual-funds', label: 'Mutual funds', description: 'Fund units and their current value', path: '/mutual-funds' },
    { key: 'ledger', label: 'Money lent / borrowed', description: 'Who owes you, who you owe, and loans', path: '/ledger' },
    { key: 'rent', label: 'Rental income', description: 'Rent received from tenants', path: '/personal#rent' },
    { key: 'gold', label: 'Gold', description: 'Jewellery and gold by weight and karat', path: '/personal#gold' },
    { key: 'assets', label: 'Property & other assets', description: 'Plots, cars and other things you own', path: '/personal#assets' },
];

const INTEREST_BY_PATH: Record<string, InterestKey> = Object.fromEntries(INTERESTS.map((i) => [i.path, i.key]));

/** The interest key that unlocks `path`, or undefined for a core path. */
export const interestForPath = (path: string): InterestKey | undefined => INTEREST_BY_PATH[path];
