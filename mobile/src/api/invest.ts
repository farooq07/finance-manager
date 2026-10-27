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
    quantity: number; price: number; date: string; fee?: number;
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
        buy_date: input.date, buy_price: input.price, quantity: input.quantity, brokerage_fee: input.fee ?? 0,
    })).data;
}

export const addMutualFund = async (fund: { fund_name: string; fund_symbol: string; units: number; current_nav: number; invested_amount: number }) =>
    (await api.post('/mutual-funds', fund)).data;
export const deleteMutualFund = async (id: string) => (await api.delete(`/mutual-funds/${id}`)).data;
export const deleteStock = async (id: string) => (await api.delete(`/stocks/${id}`)).data;
