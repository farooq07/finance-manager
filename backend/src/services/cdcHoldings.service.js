import XLSX from 'xlsx';

/**
 * Read a CDC / broker holdings export (CSV or Excel) into snapshot holdings.
 * Same columns and rules the web app's in-browser parser uses (Stocks.jsx),
 * so a file gives the same snapshot whichever app uploads it:
 *   Security|Symbol, Quantity|Holding|Position, Current Price|Market Rate|Last,
 *   Current Value|Custody Value, Cost/Unit|Purchase Price, Total Cost, …
 * Rows without a symbol or with no shares are skipped.
 */
export function parseCdcHoldings(filePath) {
    const wb = XLSX.readFile(filePath, { raw: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) : [];
    return holdingsFromRows(rows);
}

const num = (v) => {
    const n = parseFloat(String(v ?? '').replace(/,/g, '').replace('%', '').trim());
    return Number.isFinite(n) ? n : null;
};

/** Exported for tests: rows are objects keyed by the file's header names. */
export function holdingsFromRows(rows) {
    const holdings = [];
    let totalCustody = 0;

    for (const row of rows) {
        const keys = Object.keys(row);
        const find = (...names) => {
            const k = keys.find((key) => names.some((n) => key.toLowerCase().trim() === n.toLowerCase()));
            return k === undefined ? undefined : row[k];
        };

        const symbol = String(find('security', 'symbol') ?? '').trim().toUpperCase();
        const holding = num(find('quantity', 'holding', 'position')) ?? 0;
        if (!symbol || holding <= 0) continue;

        const rate = num(find('current price', 'market price', 'market_rate', 'marketrate', 'last')) ?? 0;
        const value = num(find('current value', 'custody value', 'custody_val', 'custodyval')) ?? holding * rate;
        const costPerUnit = num(find('cost/unit', 'cost_per_unit', 'purchase price')) ?? 0;
        const totalCost = num(find('total cost', 'total_cost')) ?? holding * costPerUnit;
        const changeRaw = String(find('change') ?? '').trim();
        const todayRaw = String(find('today gain/loss', 'today gain loss', 'today_gl') ?? '').trim();

        holdings.push({
            symbol,
            holding,
            market_rate: rate,
            custody_val: value,
            cost_per_unit: costPerUnit,
            total_cost: totalCost,
            roi_pct: num(find('return of investment %', 'roi %', 'roi_pct')) ?? 0,
            unrealized_gl: num(find('unrealized gain / loss', 'unrealized_gl')) ?? 0,
            change: changeRaw && changeRaw !== '-' ? (num(changeRaw) ?? 0) : value - totalCost,
            today_gl: todayRaw && todayRaw !== '-' ? (num(todayRaw) ?? 0) : 0,
        });
        totalCustody += value;
    }

    return { holdings, totalCustody };
}
