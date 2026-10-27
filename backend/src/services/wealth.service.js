import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { NISAB_GRAMS, getLatestPriceRow, summarizeGold } from './goldValuation.service.js';
import { computeZakat, zakatDeductibleDebt, debtDeductions, ZAKAT_ASSUMPTIONS } from './zakat.service.js';
import { summarizeDues } from './dues.service.js';

/**
 * One calculation of what the user owns and owes, shared by the dashboard,
 * Zakat page, AI assistant, summary emails and net-worth snapshots.
 *
 * Net worth (definition v2):
 *     cash (banks + wallets)
 *   + investments (stocks + mutual funds + PSX trading cash)
 *   + gold at the latest price
 *   + physical assets
 *   − debts (loans, credit cards)
 *
 * Not included:
 *   - rent received: it is income history, and the money already sits in a
 *     bank or wallet balance — adding it would count it twice
 *   - ledger dues (owed to you / you owe): shown separately; they are
 *     conditional cash flows, not realised wealth
 *
 * v1 (before 2026-10) added rent received and left out gold, assets and debt.
 */
export const NET_WORTH_DEFINITION = 'v2';

const sum = (rows, pick) => rows.reduce((s, r) => s + Number(pick(r) || 0), 0);

async function loadPsx(userId) {
    const [latest, latestWithSummary] = await Promise.all([
        prisma.psxSnapshot.findFirst({ where: { user_id: userId }, orderBy: { snapshot_date: 'desc' } }),
        // Trading cash lives in the CDC summary; a re-priced daily snapshot
        // may not carry one, so take the newest snapshot that does.
        prisma.psxSnapshot.findFirst({
            where: { user_id: userId, NOT: { summary_data: { equals: Prisma.AnyNull } } },
            orderBy: { snapshot_date: 'desc' },
        }),
    ]);

    if (latest) {
        const holdings = Array.isArray(latest.holdings_data) ? latest.holdings_data : [];
        return {
            value: Number(latest.total_custody),
            cost: sum(holdings, (h) => h.total_cost ?? Number(h.holding || 0) * Number(h.cost_per_unit || 0)),
            tradingCash: Number(latestWithSummary?.summary_data?.trading_cash || 0),
            syncedAt: latest.snapshot_date,
            staleHoldings: holdings.filter((h) => h.price_stale).length,
        };
    }

    // No CDC upload yet: value manually entered stocks.
    const stocks = await prisma.stock.findMany({ where: { user_id: userId }, include: { transactions: true } });
    const quotes = stocks.length
        ? await prisma.psxStock.findMany({ where: { ticker: { in: stocks.map((s) => s.stock_symbol.toUpperCase()) } } })
        : [];
    const live = new Map(quotes.map((q) => [q.ticker, Number(q.price)]));
    let value = 0;
    let cost = 0;
    let staleHoldings = 0;
    for (const stock of stocks) {
        const lots = valueManualStock(stock, live.get(stock.stock_symbol.toUpperCase()));
        value += lots.value;
        cost += lots.cost;
        if (lots.quantity > 0 && lots.stale) staleHoldings++;
    }
    return { value, cost, tradingCash: 0, syncedAt: null, staleHoldings };
}

/**
 * A hand-entered stock: shares and cost from its buy lots, priced at the
 * latest PSX close — else the price saved on the stock, else what was paid
 * (a purchase is never worth zero just because no price has synced yet).
 */
function valueManualStock(stock, livePrice) {
    // Lots in date order. Sales (negative shares) take out cost at the average
    // cost of the shares held at the time; what's left is the cost of what you own.
    const lots = [...stock.transactions].sort((a, b) => new Date(a.buy_date) - new Date(b.buy_date));
    let quantity = 0;
    let cost = 0;
    for (const t of lots) {
        const q = Number(t.quantity || 0);
        if (q > 0) {
            quantity += q;
            cost += Number(t.buy_price) * q + Number(t.brokerage_fee || 0);
        } else if (q < 0 && quantity > 0) {
            const sold = Math.min(-q, quantity);
            cost -= (cost / quantity) * sold;
            quantity -= sold;
        }
    }
    const saved = Number(stock.current_market_price || 0);
    const averageCost = quantity ? cost / quantity : 0;
    const price = livePrice ?? (saved || averageCost);
    return { quantity, cost, price, value: quantity * price, stale: livePrice == null };
}

async function loadMutualFunds(userId) {
    const [snapshot, funds] = await Promise.all([
        prisma.portfolioSnapshot.findFirst({ where: { user_id: userId }, orderBy: { upload_date: 'desc' } }),
        prisma.mutualFund.findMany({ where: { user_id: userId } }),
    ]);
    const fundValue = sum(funds, (f) => f.current_value);
    const fundCost = sum(funds, (f) => f.invested_amount);
    if (snapshot) {
        return {
            value: Number(snapshot.total_value),
            cost: Number(snapshot.total_invested) || fundCost,
            syncedAt: snapshot.upload_date,
        };
    }
    return { value: fundValue, cost: fundCost, syncedAt: null };
}

/**
 * What the user owns and owes, valued at `valuationDate` (balances as last
 * recorded, market prices as last synced — each source's date is returned).
 */
export async function computeWealth(userId, { valuationDate = new Date() } = {}) {
    const [banks, wallets, psx, mf, goldItems, priceRow, assets, debts, people, rent] = await Promise.all([
        prisma.bank.findMany({ where: { user_id: userId } }),
        prisma.wallet.findMany({ where: { user_id: userId } }),
        loadPsx(userId),
        loadMutualFunds(userId),
        prisma.goldItem.findMany({ where: { user_id: userId } }),
        getLatestPriceRow(),
        prisma.asset.findMany({ where: { user_id: userId } }),
        prisma.debt.findMany({ where: { user_id: userId, is_active: true } }),
        prisma.person.findMany({ where: { user_id: userId }, include: { transactions: true } }),
        prisma.rentEntry.aggregate({ where: { user_id: userId }, _sum: { amount: true } }),
    ]);

    const bank = sum(banks, (b) => Number(b.current_balance) * Number(b.exchange_rate || 1));
    const wallet = sum(wallets, (w) => Number(w.balance) * Number(w.exchange_rate || 1));

    const perGram = priceRow ? Number(priceRow.price_24k_per_gram) : 0;
    const gold = summarizeGold(goldItems, perGram);
    // Without a price, gold is unknown — not worth zero.
    const goldValue = perGram ? gold.totalValue : null;

    const investments = psx.value + psx.tradingCash + mf.value;
    const assetTotal = sum(assets, (a) => a.value);
    const debtOutstanding = sum(debts, (d) => d.outstanding);
    const { totalReceivable, totalPayable } = summarizeDues(people);

    const netWorth = bank + wallet + investments + (goldValue ?? 0) + assetTotal - debtOutstanding;

    const balanceDates = [...banks, ...wallets].map((a) => a.balance_as_of).filter(Boolean).map((d) => new Date(d));
    const accounts = [
        ...banks.map((b) => ({ kind: 'bank', name: b.name, value: Number(b.current_balance) * Number(b.exchange_rate || 1), asOf: b.balance_as_of ?? null })),
        ...wallets.map((w) => ({ kind: 'wallet', name: w.name, value: Number(w.balance) * Number(w.exchange_rate || 1), asOf: w.balance_as_of ?? null })),
    ];

    return {
        definition: NET_WORTH_DEFINITION,
        valuationDate,
        netWorth,
        cash: { bank, wallet, total: bank + wallet, accounts },
        investments: {
            stocks: { value: psx.value, cost: psx.cost },
            mutualFunds: { value: mf.value, cost: mf.cost },
            tradingCash: psx.tradingCash,
            total: investments,
        },
        gold: {
            value: goldValue,
            grams24k: gold.total24kGrams,
            pricePerGram24k: perGram || null,
            itemCount: goldItems.length,
        },
        assets: assetTotal,
        debts: { outstanding: debtOutstanding, zakatDeductible: zakatDeductibleDebt(debts), items: debtDeductions(debts) },
        dues: { receivable: totalReceivable, payable: totalPayable },
        rentReceived: Number(rent._sum.amount || 0),
        sources: {
            psxSyncedAt: psx.syncedAt,
            mutualFundsSyncedAt: mf.syncedAt,
            goldPriceDate: priceRow?.date ?? null,
            // Gold is owned but there is no price: its value is unknown, not zero.
            goldPriceMissing: goldItems.length > 0 && !perGram,
            psxStaleHoldings: psx.staleHoldings,
            oldestBalanceAsOf: balanceDates.length ? new Date(Math.min(...balanceDates)) : null,
        },
    };
}

/** Zakat on a wealth snapshot — the single formula every surface uses. */
export function zakatFromWealth(w) {
    const breakdown = {
        cash: w.cash.total,
        investments: w.investments.total,
        goldValue: w.gold.value ?? 0,
        receivables: w.dues.receivable,
        payables: w.dues.payable,
        debts: w.debts.zakatDeductible,
    };
    const nisabValue = w.gold.pricePerGram24k ? NISAB_GRAMS * w.gold.pricePerGram24k : null;
    return {
        breakdown,
        ...computeZakat({ ...breakdown, nisabValue }),
        goldPriceDate: w.sources.goldPriceDate,
        valuationDate: w.valuationDate,
        // Drill-down: where each line comes from, and the rules used.
        details: {
            cash: w.cash.accounts,
            investments: [
                { name: 'Stocks (PSX)', value: w.investments.stocks.value },
                { name: 'Mutual funds', value: w.investments.mutualFunds.value },
                { name: 'Brokerage cash', value: w.investments.tradingCash },
            ].filter((i) => i.value),
            gold: { grams24k: w.gold.grams24k, pricePerGram24k: w.gold.pricePerGram24k, items: w.gold.itemCount },
            debts: w.debts.items,
        },
        assumptions: ZAKAT_ASSUMPTIONS,
    };
}

/**
 * The investments part of net worth, line by line: the same totals as
 * computeWealth (so the Invest screen, dashboard and Zakat agree), plus the
 * holdings behind them and today's PSX move for each ticker.
 *
 * Stocks come from the latest CDC snapshot when there is one; otherwise from
 * stocks entered by hand (quantity from their buy lots, priced at the latest
 * PSX quote, falling back to the price saved on the stock).
 */
export async function investmentOverview(userId) {
    const [psx, mf, latest, manual, funds] = await Promise.all([
        loadPsx(userId),
        loadMutualFunds(userId),
        prisma.psxSnapshot.findFirst({ where: { user_id: userId }, orderBy: { snapshot_date: 'desc' } }),
        prisma.stock.findMany({ where: { user_id: userId }, include: { transactions: true }, orderBy: { stock_symbol: 'asc' } }),
        prisma.mutualFund.findMany({ where: { user_id: userId }, orderBy: { current_value: 'desc' } }),
    ]);

    const holdings = latest && Array.isArray(latest.holdings_data) ? latest.holdings_data : [];
    const tickers = [
        ...holdings.map((h) => String(h.symbol || '').trim().toUpperCase()),
        ...manual.map((s) => s.stock_symbol.toUpperCase()),
    ].filter(Boolean);
    const quotes = tickers.length
        ? await prisma.psxStock.findMany({ where: { ticker: { in: [...new Set(tickers)] } } })
        : [];
    const quote = new Map(quotes.map((q) => [q.ticker, q]));
    const dayChangePct = (symbol) => (quote.has(symbol) ? Number(quote.get(symbol).changePct) : null);

    let stocks;
    if (latest) {
        stocks = holdings.map((h) => {
            const symbol = String(h.symbol || '').trim().toUpperCase();
            const quantity = Number(h.holding || 0);
            const cost = Number(h.total_cost ?? quantity * Number(h.cost_per_unit || 0)) || null;
            const value = Number(h.custody_val ?? quantity * Number(h.market_rate || 0));
            return {
                id: null, symbol, name: quote.get(symbol)?.companyName ?? null, quantity,
                price: Number(h.market_rate || 0), value, cost,
                gain: cost ? value - cost : null,
                dayChangePct: dayChangePct(symbol),
                stale: Boolean(h.price_stale),
            };
        }).sort((a, b) => b.value - a.value);
    } else {
        stocks = manual.map((s) => {
            const symbol = s.stock_symbol.toUpperCase();
            const live = quote.get(symbol);
            const v = valueManualStock(s, live ? Number(live.price) : undefined);
            return {
                id: s.id, symbol, name: s.company_name ?? live?.companyName ?? null, quantity: v.quantity,
                price: v.price, value: v.value, cost: v.cost || null,
                gain: v.cost ? v.value - v.cost : null,
                dayChangePct: dayChangePct(symbol),
                stale: v.stale,
            };
        }).filter((s) => s.quantity > 0).sort((a, b) => b.value - a.value);
    }

    return {
        total: psx.value + psx.tradingCash + mf.value,
        stocks: {
            source: latest ? 'cdc' : 'manual',
            asOf: psx.syncedAt,
            value: psx.value,
            cost: psx.cost || sum(stocks, (s) => s.cost),
            holdings: stocks,
        },
        tradingCash: psx.tradingCash,
        mutualFunds: {
            asOf: mf.syncedAt,
            value: mf.value,
            cost: mf.cost,
            funds: funds.map((f) => ({
                id: f.id, name: f.fund_name, symbol: f.fund_symbol,
                units: Number(f.units), nav: Number(f.current_nav),
                value: Number(f.current_value), invested: Number(f.invested_amount),
                gain: Number(f.current_value) - Number(f.invested_amount),
            })),
        },
    };
}
