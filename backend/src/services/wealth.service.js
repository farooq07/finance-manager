import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { NISAB_GRAMS, getLatestPriceRow, summarizeGold } from './goldValuation.service.js';
import { computeZakat, zakatDeductibleDebt } from './zakat.service.js';
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
    let value = 0;
    for (const stock of stocks) {
        const qty = stock.transactions.reduce((q, tx) => q + Number(tx.quantity || 0), 0);
        value += qty * Number(stock.current_market_price || 0);
    }
    return { value, cost: 0, tradingCash: 0, syncedAt: null, staleHoldings: 0 };
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

    return {
        definition: NET_WORTH_DEFINITION,
        valuationDate,
        netWorth,
        cash: { bank, wallet, total: bank + wallet },
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
        debts: { outstanding: debtOutstanding, zakatDeductible: zakatDeductibleDebt(debts) },
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
    };
}
