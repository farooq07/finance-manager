/**
 * Deterministic colour per ticker.
 *
 * The allocation donut previously used ECharts' default palette, which
 * assigns colours by array index. That meant a ticker changed colour whenever
 * the holdings list changed length or order — so the same holding was one
 * colour on Monday and another on Tuesday, and the donut could not be read
 * against the table beside it.
 *
 * Hashing the symbol instead pins FFC to one colour permanently, everywhere
 * in the app, regardless of what else is held.
 */

// Chosen to stay distinguishable in both themes and to keep adjacent hues
// apart for the most common red/green colour-vision deficiencies. Blues,
// ambers and purples carry the palette; pure red/green pairs are avoided.
export const TICKER_PALETTE = [
    '#2563eb', // blue
    '#f59e0b', // amber
    '#7c3aed', // violet
    '#0891b2', // cyan
    '#db2777', // pink
    '#65a30d', // lime
    '#ea580c', // orange
    '#0d9488', // teal
    '#4f46e5', // indigo
    '#c026d3', // fuchsia
    '#ca8a04', // yellow-dark
    '#0284c7', // sky
    '#9333ea', // purple
    '#dc2626', // red
    '#059669', // emerald
    '#8b5cf6', // light violet
];

// Reserved for the aggregated "Other" slice so it never collides with a real
// ticker and always reads as a neutral bucket.
export const OTHER_COLOR = '#94a3b8'; // slate-400

/**
 * FNV-1a. Small, fast, and stable across runs and machines — which matters,
 * because a colour that changes between sessions defeats the whole purpose.
 */
function hashString(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

/**
 * The colour for a ticker. Same input always yields the same output.
 * @param {string} ticker
 * @returns {string} hex colour
 */
export function colorForTicker(ticker) {
    const key = String(ticker || '').trim().toUpperCase();
    if (!key) return OTHER_COLOR;
    return TICKER_PALETTE[hashString(key) % TICKER_PALETTE.length];
}

/**
 * Build an ECharts-ready colour list aligned to a series of named items.
 * @param {Array<{name: string}>} items
 */
export function colorsForSeries(items = []) {
    return items.map(item => (item.name === 'Other' ? OTHER_COLOR : colorForTicker(item.name)));
}
