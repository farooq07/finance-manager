import prisma from '../utils/prisma.js';
import { fetchDashboardData } from '../controllers/dashboard.controller.js';
import { computeWealth, zakatFromWealth } from './wealth.service.js';
import { loadMoneyEvents, summarizeFlows, FLOW } from './moneyFlow.service.js';
import {
  NISAB_GRAMS,
  ZAKAT_RATE,
  valueForItem,
  equivalent24kGrams,
  getLatestPriceRow,
} from './goldValuation.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Shared gold aggregation used by the gold, zakat and overview tools.
async function computeGoldTotals(userId) {
  const [items, priceRow] = await Promise.all([
    prisma.goldItem.findMany({ where: { user_id: userId } }),
    getLatestPriceRow(),
  ]);

  const perGram = priceRow ? Number(priceRow.price_24k_per_gram) : 0;
  let total24kGrams = 0;
  let totalValue = 0;

  const rows = items.map((i) => {
    total24kGrams += equivalent24kGrams(i);
    const cur = valueForItem(i, perGram);
    totalValue += cur;
    return {
      name: i.name,
      type: i.type,
      weight_grams: Number(i.weight_grams),
      carats: i.carats,
      current_value: Math.round(cur),
    };
  });

  const isNisabMet = total24kGrams >= NISAB_GRAMS;

  return {
    item_count: items.length,
    total_value: Math.round(totalValue),
    total_24k_grams: Number(total24kGrams.toFixed(3)),
    is_nisab_met: isNisabMet,
    gold_zakat_due: Math.round(isNisabMet ? totalValue * ZAKAT_RATE : 0),
    price_per_gram_24k: perGram ? Math.round(perGram) : 0,
    price_date: priceRow?.date || null,
    items: rows,
  };
}

// Gemini format — used by ragEngine when provider = 'gemini'
export const TOOL_DEFINITIONS = [
  {
    name: 'getExpenseSummary',
    description: 'Get total expenses grouped by category for a date range. Use for questions about spending totals, breakdowns by category, or budget analysis.',
    parameters: {
      type: 'object',
      properties: {
        months: { type: 'number', description: 'How many past months to include (1–24). Default 1.' },
        category: { type: 'string', description: 'Optional: filter to a specific category like "Food & Dining"' }
      },
      required: []
    }
  },
  {
    name: 'getTransactionList',
    description: 'Get a list of recent approved transactions from both bank accounts and wallets. Use for "show me my recent transactions", "what did I spend on yesterday", or "show debit transactions".',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of transactions to return (default 10, max 50).' },
        type: { type: 'string', description: '"debit" for outgoing, "credit" for incoming, or omit for both.' },
        days: { type: 'number', description: 'How many past days to include. Default 30.' },
        source: { type: 'string', description: '"bank" for bank-only, "wallet" for wallet-only, or omit for both.' }
      },
      required: []
    }
  },
  {
    name: 'getWalletTransactions',
    description: 'Get approved transactions from wallet accounts (EasyPaisa, JazzCash, NayaPay, etc). Use when user specifically asks about wallet or mobile money transactions.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of transactions to return (default 10, max 50).' },
        days: { type: 'number', description: 'How many past days to include. Default 30.' },
        type: { type: 'string', description: '"debit" for outgoing, "credit" for incoming.' }
      },
      required: []
    }
  },
  {
    name: 'getIncomeVsExpense',
    description: 'Get monthly income vs expense comparison. Use for questions about cash flow trends or income vs spending over multiple months.',
    parameters: {
      type: 'object',
      properties: {
        months: { type: 'number', description: 'How many months of history to show (default 6, max 24).' }
      },
      required: []
    }
  },
  {
    name: 'getBeneficiaryStats',
    description: 'Get transfer statistics for a specific beneficiary. Use for questions like "how much did I send to Ahmed?" or "what is my transaction history with X?".',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name or partial name of the beneficiary to search for.' }
      },
      required: ['name']
    }
  },
  {
    name: 'getTopMerchants',
    description: 'Get top merchants or payees by spending. Use for questions like "where do I spend the most?" or "top 5 places I spend money".',
    parameters: {
      type: 'object',
      properties: {
        months: { type: 'number', description: 'How many past months to include (default 3).' },
        limit: { type: 'number', description: 'Number of merchants to return (default 10).' }
      },
      required: []
    }
  },
  {
    name: 'getMonthlyExpenses',
    description: 'Get expense breakdown for a specific month. Use for "how much did I spend in March?" or "show me April expenses by category".',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Month number 1–12. Default is current month.' },
        year: { type: 'number', description: 'Year (e.g. 2025). Default is current year.' }
      },
      required: []
    }
  },
  {
    name: 'getCashFlow',
    description: 'Get monthly net cash flow trend. Use for questions about overall financial health, net savings, or monthly surplus/deficit.',
    parameters: {
      type: 'object',
      properties: {
        months: { type: 'number', description: 'How many months of history (default 6, max 24).' }
      },
      required: []
    }
  },
  {
    name: 'getAssetSummary',
    description: 'Get a summary of physical assets. Use for "what assets do I have?" or "what is my total asset value?".',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Optional: filter by asset type like "Vehicle", "Property", "Electronics".' }
      },
      required: []
    }
  },
  {
    name: 'getMutualFundPerformance',
    description: 'Get mutual fund portfolio performance. Use for "how are my funds performing?" or "what is my mutual fund gain?".',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getStockPortfolio',
    description: 'Get stock portfolio summary with P&L. Use for "what stocks do I have?" or "what is my stock portfolio value?".',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getDuesList',
    description: 'Get pending dues and receivables. Use for "what do I owe?" or "who owes me money?" or "show my dues".',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '"payable" for what you owe, "receivable" for what others owe you. Omit for both.' }
      },
      required: []
    }
  },
  {
    name: 'getWalletSummary',
    description: 'Get current wallet and bank account balances. Use for "what is my balance?" or "how much money do I have?" or "show my accounts". Returns each account by name (e.g. Standard Chartered, Habib) so you can answer about a specific account too.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getFinancialOverview',
    description: 'Get a complete net-worth snapshot covering EVERY area at once: total/net worth plus bank balances, wallet balances, investments (stocks + mutual funds), gold value, physical assets, rent balance, receivables, payables, debt, this month\'s expenses, zakat given this year and estimated zakat due. Use for broad questions like "what is my total worth / net worth?", "give me a full snapshot", "show me everything", "how am I doing overall?".',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getZakatSummary',
    description: 'Get zakat details: total zakat already given (this year and all-time), recent zakat payments, and the estimated zakat still to pay (2.5% of net worth minus receivables, plus zakat due on gold when nisab is met). Use for "how much zakat have I given/paid?" or "how much zakat do I owe / have to pay?".',
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Calendar year for the "given" totals (e.g. 2026). Default is the current year.' }
      },
      required: []
    }
  },
  {
    name: 'getGoldSummary',
    description: 'Get gold holdings with their current PKR value at the latest gold price, total weight, total current value, and gold zakat due. Use for "what is my gold worth?", "how much gold do I have?", "gold value today".',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getDividendSummary',
    description: 'Get dividend income received, grouped by security, with total gross and net amounts. Use for "how much dividend did I earn?" or "show my dividend income".',
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Filter to dividends paid in this calendar year. Omit for all-time.' }
      },
      required: []
    }
  },
  {
    name: 'getDebtSummary',
    description: 'Get outstanding institutional debt (loans, credit cards) that is still active, with total outstanding and a per-debt breakdown. Use for "what debt do I have?" or "how much do I owe on loans?".',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Groq / OpenAI-compatible format — derived automatically from TOOL_DEFINITIONS
export const GROQ_TOOL_DEFINITIONS = TOOL_DEFINITIONS.map(t => ({
  type: 'function',
  function: { name: t.name, description: t.description, parameters: t.parameters }
}));

export async function executeTool(toolName, args, userId) {
  switch (toolName) {
    case 'getExpenseSummary': {
      // Same spending rules as the dashboard: imported + manual, each event once.
      const now = new Date();
      const since = new Date(now.getFullYear(), now.getMonth() - (args.months || 1), now.getDate());
      const events = (await loadMoneyEvents(userId, since, new Date(now.getTime() + DAY_MS)))
        .filter(e => e.kind === FLOW.SPEND)
        .filter(e => !args.category || e.category.toLowerCase().includes(String(args.category).toLowerCase()));

      const byCat = new Map();
      for (const e of events) {
        const c = byCat.get(e.category) || { category: e.category, total: 0, count: 0 };
        c.total += e.amount;
        c.count += 1;
        byCat.set(e.category, c);
      }
      return [...byCat.values()]
        .sort((a, b) => b.total - a.total)
        .map(c => ({ category: c.category, total: Math.round(c.total), count: c.count, avg: Math.round(c.total / c.count) }));
    }

    case 'getTransactionList': {
      const since = new Date();
      since.setDate(since.getDate() - (args.days || 30));
      const limit = Math.min(args.limit || 10, 50);
      const amountFilter = args.type === 'debit' ? { lt: 0 } : args.type === 'credit' ? { gt: 0 } : undefined;

      const [bankTxns, walletTxns] = await Promise.all([
        args.source === 'wallet' ? [] : prisma.bankTransactionLog.findMany({
          where: {
            bank_statement: { bank: { user_id: userId } },
            transaction_date: { gte: since },
            user_approved: true,
            ...(amountFilter ? { net_amount: amountFilter } : {})
          },
          orderBy: { transaction_date: 'desc' },
          take: limit,
          select: { transaction_date: true, description: true, net_amount: true, approved_category: true }
        }),
        args.source === 'bank' ? [] : prisma.walletTransactionLog.findMany({
          where: {
            wallet_statement: { wallet: { user_id: userId } },
            transaction_date: { gte: since },
            user_approved: true,
            ...(amountFilter ? { net_amount: amountFilter } : {})
          },
          orderBy: { transaction_date: 'desc' },
          take: limit,
          select: { transaction_date: true, description: true, net_amount: true, approved_category: true }
        })
      ]);

      return [...bankTxns, ...walletTxns]
        .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
        .slice(0, limit)
        .map(t => ({
          date: t.transaction_date,
          description: t.description,
          amount: Math.abs(Number(t.net_amount)),
          type: Number(t.net_amount) < 0 ? 'debit' : 'credit',
          category: t.approved_category
        }));
    }

    case 'getWalletTransactions': {
      const since = new Date();
      since.setDate(since.getDate() - (args.days || 30));
      const limit = Math.min(args.limit || 10, 50);
      const amountFilter = args.type === 'debit' ? { lt: 0 } : args.type === 'credit' ? { gt: 0 } : undefined;

      const txns = await prisma.walletTransactionLog.findMany({
        where: {
          wallet_statement: { wallet: { user_id: userId } },
          transaction_date: { gte: since },
          user_approved: true,
          ...(amountFilter ? { net_amount: amountFilter } : {})
        },
        orderBy: { transaction_date: 'desc' },
        take: limit,
        select: { transaction_date: true, description: true, net_amount: true, approved_category: true }
      });

      return txns.map(t => ({
        date: t.transaction_date,
        description: t.description,
        amount: Math.abs(Number(t.net_amount)),
        type: Number(t.net_amount) < 0 ? 'debit' : 'credit',
        category: t.approved_category
      }));
    }

    case 'getIncomeVsExpense': {
      const months = Math.min(args.months || 6, 24);
      const now = new Date();
      const result = [];
      for (let i = months - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const { totals } = summarizeFlows(await loadMoneyEvents(userId, start, end));
        result.push({
          month: monthKey(start),
          income: Math.round(totals.income),
          expenses: Math.round(totals.spend),
          net: Math.round(totals.income - totals.spend),
        });
      }
      return result;
    }

    case 'getBeneficiaryStats': {
      const beneficiaries = await prisma.beneficiary.findMany({
        where: { user_id: userId, name: { contains: args.name, mode: 'insensitive' } },
        include: { transactions: true }
      });

      return beneficiaries.map(b => {
        const sent = b.transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + Number(t.amount), 0);
        const received = b.transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + Number(t.amount), 0);
        const dates = b.transactions.map(t => t.transaction_date).sort();

        return {
          name: b.name,
          total_sent: Math.round(sent),
          total_received: Math.round(received),
          count: b.transactions.length,
          last_date: dates[dates.length - 1] || null
        };
      });
    }

    case 'getTopMerchants': {
      const since = new Date();
      since.setMonth(since.getMonth() - (args.months || 3));
      const limit = Math.min(args.limit || 10, 30);

      const txns = await prisma.bankTransactionLog.findMany({
        where: {
          bank_statement: { bank: { user_id: userId } },
          transaction_date: { gte: since },
          net_amount: { lt: 0 },
          user_approved: true
        },
        select: { description: true, net_amount: true }
      });

      const merchantMap = {};
      for (const t of txns) {
        const key = t.description.slice(0, 40).trim();
        if (!merchantMap[key]) merchantMap[key] = { merchant: key, total: 0, count: 0 };
        merchantMap[key].total += Math.abs(Number(t.net_amount));
        merchantMap[key].count += 1;
      }

      return Object.values(merchantMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
        .map(m => ({ ...m, total: Math.round(m.total) }));
    }

    case 'getMonthlyExpenses': {
      const now = new Date();
      const month = args.month || (now.getMonth() + 1);
      const year = args.year || now.getFullYear();
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);

      const events = await loadMoneyEvents(userId, start, end);
      const { totals, spendByCategory } = summarizeFlows(events);
      const counts = new Map();
      for (const e of events) if (e.kind === FLOW.SPEND) counts.set(e.category, (counts.get(e.category) || 0) + 1);

      return {
        month: monthKey(start),
        total: Math.round(totals.spend),
        refunds: Math.round(totals.refunds),
        transfers_between_own_accounts: Math.round(totals.transfers),
        cash_withdrawn: Math.round(totals.cashWithdrawn),
        categories: [...spendByCategory]
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => ({ category, amount: Math.round(amount), count: counts.get(category) || 0 })),
      };
    }

    case 'getCashFlow': {
      // Income minus spending per month; money moved between your own
      // accounts is neither.
      const months = Math.min(args.months || 6, 24);
      const now = new Date();
      const result = [];
      let running = 0;
      for (let i = months - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const { totals } = summarizeFlows(await loadMoneyEvents(userId, start, end));
        const net = Math.round(totals.income - totals.spend);
        running += net;
        result.push({ month: monthKey(start), net, running_total: running });
      }
      return result;
    }

    case 'getAssetSummary': {
      const where = { user_id: userId };
      if (args.type) where.type = { contains: args.type, mode: 'insensitive' };

      const assets = await prisma.asset.findMany({
        where,
        orderBy: { value: 'desc' },
        select: { name: true, type: true, value: true, purchase_date: true }
      });

      const total = assets.reduce((s, a) => s + Number(a.value), 0);

      return {
        total: Math.round(total),
        assets: assets.map(a => ({
          name: a.name,
          type: a.type,
          value: Math.round(Number(a.value)),
          purchase_date: a.purchase_date
        }))
      };
    }

    case 'getMutualFundPerformance': {
      const funds = await prisma.mutualFund.findMany({
        where: { user_id: userId, status: 'active' },
        select: { fund_name: true, fund_symbol: true, units: true, current_nav: true, current_value: true, invested_amount: true, gain_loss_since_inception: true }
      });

      const totalInvested = funds.reduce((s, f) => s + Number(f.invested_amount), 0);
      const totalCurrent = funds.reduce((s, f) => s + Number(f.current_value), 0);

      return {
        total_invested: Math.round(totalInvested),
        total_current: Math.round(totalCurrent),
        total_gain: Math.round(totalCurrent - totalInvested),
        gain_pct: totalInvested > 0 ? Math.round(((totalCurrent - totalInvested) / totalInvested) * 10000) / 100 : 0,
        funds: funds.map(f => ({
          fund: f.fund_name,
          symbol: f.fund_symbol,
          units: Number(f.units),
          nav: Number(f.current_nav),
          invested: Math.round(Number(f.invested_amount)),
          current: Math.round(Number(f.current_value)),
          gain: Math.round(Number(f.current_value) - Number(f.invested_amount)),
          gain_pct: Number(f.invested_amount) > 0
            ? Math.round(((Number(f.current_value) - Number(f.invested_amount)) / Number(f.invested_amount)) * 10000) / 100
            : 0
        }))
      };
    }

    case 'getStockPortfolio': {
      const stocks = await prisma.stock.findMany({
        where: { user_id: userId },
        include: { transactions: true },
        orderBy: { stock_symbol: 'asc' }
      });

      const rows = stocks.map(s => {
        const totalQty = s.transactions.reduce((sum, t) => sum + t.quantity, 0);
        const totalCost = s.transactions.reduce((sum, t) => sum + Number(t.buy_price) * t.quantity + Number(t.brokerage_fee || 0), 0);
        const currentVal = totalQty * Number(s.current_market_price || 0);
        const pnl = currentVal - totalCost;

        return {
          ticker: s.stock_symbol,
          company: s.company_name,
          qty: totalQty,
          avg_cost: totalQty > 0 ? Math.round(totalCost / totalQty) : 0,
          current_price: Number(s.current_market_price || 0),
          current_value: Math.round(currentVal),
          pnl: Math.round(pnl),
          pnl_pct: totalCost > 0 ? Math.round((pnl / totalCost) * 10000) / 100 : 0
        };
      });

      const totalInvested = rows.reduce((s, r) => s + r.avg_cost * r.qty, 0);
      const totalCurrent = rows.reduce((s, r) => s + r.current_value, 0);

      // Best-effort "today's change": join the user's latest PSX holdings to the
      // live scraped daily prices (psx_stocks). Coverage is partial — only tickers
      // that are both held and present in the scraped set get a day change.
      let todayChangeValue = 0;
      let matched = 0;
      let unmatched = 0;
      try {
        const latestPsx = await prisma.psxSnapshot.findFirst({
          where: { user_id: userId },
          orderBy: { snapshot_date: 'desc' },
          select: { holdings_data: true }
        });
        const holdings = Array.isArray(latestPsx?.holdings_data) ? latestPsx.holdings_data : [];

        if (holdings.length > 0) {
          const symbols = [...new Set(holdings.map(h => String(h.symbol || h.ticker || '').toUpperCase()).filter(Boolean))];
          const liveRows = await prisma.psxStock.findMany({
            where: { ticker: { in: symbols } },
            select: { ticker: true, change: true }
          });
          const changeByTicker = Object.fromEntries(liveRows.map(r => [r.ticker.toUpperCase(), Number(r.change)]));

          for (const h of holdings) {
            const ticker = String(h.symbol || h.ticker || '').toUpperCase();
            const qty = Number(h.holding ?? h.quantity ?? 0);
            if (ticker in changeByTicker) {
              todayChangeValue += qty * changeByTicker[ticker];
              matched += 1;
            } else {
              unmatched += 1;
            }
          }
        }
      } catch {
        // No PSX snapshot / live prices — skip today's change silently.
      }

      const todayPct = totalCurrent > 0 ? Math.round((todayChangeValue / totalCurrent) * 10000) / 100 : 0;

      return {
        total_invested: Math.round(totalInvested),
        total_current: Math.round(totalCurrent),
        total_pnl: Math.round(totalCurrent - totalInvested),
        today_change_value: Math.round(todayChangeValue),
        today_change_pct: todayPct,
        today_coverage: { matched, unmatched },
        stocks: rows.filter(r => r.qty > 0)
      };
    }

    case 'getDuesList': {
      const where = { user_id: userId };
      if (args.type) where.transaction_type = args.type;

      const dues = await prisma.duesTransaction.findMany({
        where,
        include: { person: { select: { name: true } } },
        orderBy: { transaction_date: 'desc' }
      });

      const summary = {};
      for (const d of dues) {
        const key = d.person_id;
        if (!summary[key]) {
          summary[key] = { person: d.person.name, payable: 0, receivable: 0 };
        }
        if (d.transaction_type === 'payable') summary[key].payable += Number(d.amount);
        else summary[key].receivable += Number(d.amount);
      }

      return Object.values(summary)
        .map(s => ({
          person: s.person,
          payable: Math.round(s.payable),
          receivable: Math.round(s.receivable),
          net: Math.round(s.receivable - s.payable)
        }))
        .filter(s => s.payable > 0 || s.receivable > 0);
    }

    case 'getWalletSummary': {
      const [banks, wallets] = await Promise.all([
        prisma.bank.findMany({
          where: { user_id: userId },
          select: { name: true, account_no: true, current_balance: true, currency: true }
        }),
        prisma.wallet.findMany({
          where: { user_id: userId },
          select: { name: true, institution: true, balance: true, currency: true }
        })
      ]);

      const accounts = [
        ...banks.map(b => ({ name: b.name, account: b.account_no, balance: Math.round(Number(b.current_balance)), currency: b.currency, type: 'bank' })),
        ...wallets.map(w => ({ name: w.name, account: w.institution, balance: Math.round(Number(w.balance)), currency: w.currency, type: 'wallet' }))
      ];

      const totalPKR = accounts.filter(a => a.currency === 'PKR').reduce((s, a) => s + a.balance, 0);

      return { total_pkr: totalPKR, accounts };
    }

    case 'getFinancialOverview': {
      const [data, wealth] = await Promise.all([fetchDashboardData(userId), computeWealth(userId)]);
      const m = data.metrics;
      const zakat = zakatFromWealth(wealth);

      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const zakatGiven = await prisma.zakat.aggregate({
        where: { user_id: userId, date: { gte: yearStart } },
        _sum: { amount: true }
      });

      return {
        // Same figures, same definitions as the Dashboard and Zakat pages.
        net_worth: Math.round(wealth.netWorth),
        net_worth_definition: 'cash + investments + gold + physical assets - debts (rent received and ledger dues not included)',
        valuation_date: wealth.valuationDate,
        total_bank: Math.round(wealth.cash.bank),
        total_wallet: Math.round(wealth.cash.wallet),
        total_investments: Math.round(wealth.investments.total),
        mutual_fund_value: Math.round(wealth.investments.mutualFunds.value),
        stock_value: Math.round(wealth.investments.stocks.value),
        gold_value: wealth.gold.value == null ? null : Math.round(wealth.gold.value),
        gold_price_date: wealth.sources.goldPriceDate,
        asset_value: Math.round(wealth.assets),
        rent_received_all_time: Math.round(wealth.rentReceived),
        receivable: Math.round(wealth.dues.receivable),
        payable: Math.round(wealth.dues.payable),
        debt: Math.round(wealth.debts.outstanding),
        current_month_expenses: Math.round(Number(m.currentMonthExpenses)),
        zakat_given_this_year: Math.round(Number(zakatGiven._sum.amount || 0)),
        zakat_due_estimate: Math.round(zakat.zakatDue),
        zakat_nisab_met: zakat.isNisabMet,
      };
    }

    case 'getZakatSummary': {
      const year = args.year || new Date().getFullYear();
      const yStart = new Date(year, 0, 1);
      const yEnd = new Date(year, 11, 31, 23, 59, 59);

      const [yearAgg, allAgg, entries, wealth] = await Promise.all([
        prisma.zakat.aggregate({ where: { user_id: userId, date: { gte: yStart, lte: yEnd } }, _sum: { amount: true } }),
        prisma.zakat.aggregate({ where: { user_id: userId }, _sum: { amount: true } }),
        prisma.zakat.findMany({
          where: { user_id: userId },
          orderBy: { date: 'desc' },
          take: 10,
          select: { date: true, amount: true, description: true }
        }),
        computeWealth(userId),
      ]);
      // The Zakat page's formula, not a separate estimate.
      const zakat = zakatFromWealth(wealth);

      return {
        year,
        given_this_year: Math.round(Number(yearAgg._sum.amount || 0)),
        given_all_time: Math.round(Number(allAgg._sum.amount || 0)),
        estimated_due: Math.round(zakat.zakatDue),
        net_zakatable_wealth: Math.round(zakat.netZakatable),
        zakatable_assets: Math.round(zakat.zakatableAssets),
        deductions: Math.round(zakat.deductions),
        nisab_value: zakat.nisabValue == null ? null : Math.round(zakat.nisabValue),
        is_nisab_met: zakat.isNisabMet,
        gold_price_date: zakat.goldPriceDate,
        valuation_date: zakat.valuationDate,
        entries: entries.map(e => ({
          date: e.date,
          amount: Math.round(Number(e.amount)),
          description: e.description
        }))
      };
    }

    case 'getGoldSummary': {
      const gold = await computeGoldTotals(userId);
      return {
        item_count: gold.item_count,
        total_value: gold.total_value,
        total_24k_grams: gold.total_24k_grams,
        price_per_gram_24k: gold.price_per_gram_24k,
        price_date: gold.price_date,
        gold_zakat_due: gold.gold_zakat_due,
        is_nisab_met: gold.is_nisab_met,
        items: gold.items
      };
    }

    case 'getDividendSummary': {
      const where = { user_id: userId };
      if (args.year) {
        const yStart = new Date(args.year, 0, 1);
        const yEnd = new Date(args.year, 11, 31, 23, 59, 59);
        where.payment_date = { gte: yStart, lte: yEnd };
      }

      const dividends = await prisma.dividend.findMany({
        where,
        select: { security_symbol: true, security_name: true, gross_dividend_amount: true, net_dividend_amount: true }
      });

      const bySecurity = {};
      for (const d of dividends) {
        const key = d.security_symbol;
        if (!bySecurity[key]) bySecurity[key] = { security: key, name: d.security_name, gross: 0, net: 0, count: 0 };
        bySecurity[key].gross += Number(d.gross_dividend_amount);
        bySecurity[key].net += Number(d.net_dividend_amount);
        bySecurity[key].count += 1;
      }

      const rows = Object.values(bySecurity)
        .map(s => ({ ...s, gross: Math.round(s.gross), net: Math.round(s.net) }))
        .sort((a, b) => b.net - a.net);

      return {
        year: args.year || 'all-time',
        total_gross: rows.reduce((s, r) => s + r.gross, 0),
        total_net: rows.reduce((s, r) => s + r.net, 0),
        count: dividends.length,
        securities: rows
      };
    }

    case 'getDebtSummary': {
      const debts = await prisma.debt.findMany({
        where: { user_id: userId, is_active: true },
        orderBy: { outstanding: 'desc' },
        select: { name: true, debt_type: true, principal: true, outstanding: true, interest_rate: true, minimum_payment: true }
      });

      const totalOutstanding = debts.reduce((s, d) => s + Number(d.outstanding), 0);

      return {
        total_outstanding: Math.round(totalOutstanding),
        count: debts.length,
        debts: debts.map(d => ({
          name: d.name,
          type: d.debt_type,
          principal: Math.round(Number(d.principal)),
          outstanding: Math.round(Number(d.outstanding)),
          interest_rate: d.interest_rate != null ? Number(d.interest_rate) : null,
          minimum_payment: d.minimum_payment != null ? Math.round(Number(d.minimum_payment)) : null
        }))
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
