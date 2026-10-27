import { api } from './client';

// Investments: one overview read (valued exactly as net worth values them),
// the PSX market list, and hand-entered stock lots and mutual funds.

export type StockHolding = {
    id: string | null; symbol: string; name: string | null; quantity: number;
    price: number; value: number; cost: number | null; gain: number | null;
    dayChangePct: number | null; stale: boolean;
};
export type FundHolding = {
    id: string; name: string; symbol: string; units: number; nav: number;
    value: number; invested: number; gain: number;
};
export type InvestmentOverview = {
    total: number;
    stocks: { source: 'cdc' | 'manual'; asOf: string | null; value: number; cost: number; holdings: StockHolding[] };
    tradingCash: number;
    mutualFunds: { asOf: string | null; value: number; cost: number; funds: FundHolding[] };
};
export type PsxQuote = {
    ticker: string; companyName: string; price: number; change: number; changePct: number;
    high: number; low: number; volume: string; lastUpdated: string;
};

export const investmentsKey = ['investments'] as const;

export const getInvestments = async () => (await api.get<InvestmentOverview>('/investments')).data;
export const getPsxMarket = async () => (await api.get<PsxQuote[]>('/stocks/psx')).data;

/** Record a purchase: reuses the stock if it's already tracked, otherwise adds it first. */
export async function addStockLot(input: {
    existingId: string | null; symbol: string; name?: string | null;
    quantity: number; price: number; date: string; fee?: number; side?: 'buy' | 'sell';
}) {
    let id = input.existingId;
    if (!id) {
        // A stock with no lots left isn't in the overview but still exists.
        const tracked = (await api.get<{ id: string; stock_symbol: string }[]>('/stocks')).data
            .find((s) => s.stock_symbol.toUpperCase() === input.symbol);
        id = tracked?.id
            ?? (await api.post<{ id: string }>('/stocks', { stock_symbol: input.symbol, company_name: input.name ?? null })).data.id;
    }
    return (await api.post(`/stocks/${id}/transactions`, {
        buy_date: input.date, buy_price: input.price, quantity: input.quantity, brokerage_fee: input.fee ?? 0, side: input.side ?? 'buy',
    })).data;
}

export const addMutualFund = async (fund: { fund_name: string; fund_symbol: string; units: number; current_nav: number; invested_amount: number }) =>
    (await api.post('/mutual-funds', fund)).data;
export const deleteMutualFund = async (id: string) => (await api.delete(`/mutual-funds/${id}`)).data;
export const deleteStock = async (id: string) => (await api.delete(`/stocks/${id}`)).data;

// Statements -------------------------------------------------------------------
type Picked = { uri: string; name: string; mimeType?: string | null };
const fileForm = (field: string, file: Picked, extra: Record<string, string> = {}) => {
    const form = new FormData();
    form.append(field, { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    return form;
};
const multipart = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 };

/** CDC / broker holdings export (CSV or Excel): becomes your stock holdings as of that date. */
export const uploadCdcStatement = async (file: Picked, snapshotDate?: string) =>
    (await api.post<{ snapshot_date: string; total_custody: string }>('/psx/snapshots/upload',
        fileForm('file', file, snapshotDate ? { snapshot_date: snapshotDate } : {}), multipart)).data;
/** Mutual fund portfolio statement (CSV or Excel): creates or updates your funds. */
export const uploadFundStatement = async (file: Picked) =>
    (await api.post<{ message: string; processed: number; created: number }>('/mutual-funds/upload', fileForm('portfolioCSV', file), multipart)).data;

// Prices and dividends -----------------------------------------------------------
export type PricePoint = { date: string; close: number };
export const getPriceHistory = async (ticker: string, days = 90) =>
    (await api.get<PricePoint[]>(`/stocks/${encodeURIComponent(ticker)}/history`, { params: { days } })).data;

export type Dividend = {
    id: string; security_symbol: string; security_name: string | null; financial_year: string | null;
    gross_dividend_amount: string; net_dividend_amount: string; payment_date: string | null; status: string | null;
};
export const getDividends = async () => (await api.get<Dividend[]>('/dividends')).data;
/** Record a dividend by hand (CDC-imported ones arrive from the web app's dividend sync). */
export const addDividend = async (d: { symbol: string; net: number; gross?: number; date: string }) =>
    (await api.post('/dividends/sync', { dividends: [{
        event_id: `manual-${d.symbol}-${d.date}-${Date.now()}`, security_symbol: d.symbol, security_name: null,
        gross_dividend_amount: d.gross ?? d.net, net_dividend_amount: d.net, payment_date: d.date, status: 'Paid',
    }] })).data;
export const deleteDividend = async (id: string) => (await api.delete(`/dividends/${id}`)).data;

// Watchlist ----------------------------------------------------------------------
export type WatchItem = {
    id: string; ticker: string; notes: string | null; companyName: string | null;
    price: number | null; change: number | null; changePct: number | null; lastUpdated: string | null;
};
export const watchlistKey = ['watchlist'] as const;
export const getWatchlist = async () => (await api.get<WatchItem[]>('/watchlist')).data;
/** A ticker with no price yet gets one fetched within a minute or so. */
export const watch = async (ticker: string) => (await api.post('/watchlist', { ticker })).data;
export const unwatch = async (ticker: string) => (await api.delete(`/watchlist/${encodeURIComponent(ticker)}`)).data;
