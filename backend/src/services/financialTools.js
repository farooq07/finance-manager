import prisma from '../utils/prisma.js';

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
    description: 'Get current wallet and bank account balances. Use for "what is my balance?" or "how much money do I have?" or "show my accounts".',
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
      const since = new Date();
      since.setMonth(since.getMonth() - (args.months || 1));
      const where = { user_id: userId, expense_date: { gte: since } };
      if (args.category) where.category = { contains: args.category, mode: 'insensitive' };

      const rows = await prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: { id: true },
        _avg: { amount: true },
        orderBy: { _sum: { amount: 'desc' } }
      });

      return rows.map(r => ({
        category: r.category,
        total: Number(r._sum.amount),
        count: r._count.id,
        avg: Math.round(Number(r._avg.amount))
      }));
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
      const result = [];

      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);

        const [credits, debits, expenseSum] = await Promise.all([
          prisma.bankTransactionLog.aggregate({
            where: { bank_statement: { bank: { user_id: userId } }, transaction_date: { gte: start, lte: end }, net_amount: { gt: 0 }, user_approved: true },
            _sum: { net_amount: true }
          }),
          prisma.bankTransactionLog.aggregate({
            where: { bank_statement: { bank: { user_id: userId } }, transaction_date: { gte: start, lte: end }, net_amount: { lt: 0 }, user_approved: true },
            _sum: { net_amount: true }
          }),
          prisma.expense.aggregate({
            where: { user_id: userId, expense_date: { gte: start, lte: end } },
            _sum: { amount: true }
          })
        ]);

        const income = Number(credits._sum.net_amount || 0);
        const bankDebits = Math.abs(Number(debits._sum.net_amount || 0));
        const manualExpenses = Number(expenseSum._sum.amount || 0);
        const expenses = bankDebits + manualExpenses;

        result.push({
          month: `${year}-${String(month).padStart(2, '0')}`,
          income: Math.round(income),
          expenses: Math.round(expenses),
          net: Math.round(income - expenses)
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
      const end = new Date(year, month, 0, 23, 59, 59);

      const rows = await prisma.expense.groupBy({
        by: ['category'],
        where: { user_id: userId, expense_date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } }
      });

      const total = rows.reduce((s, r) => s + Number(r._sum.amount), 0);

      return {
        month: `${year}-${String(month).padStart(2, '0')}`,
        total: Math.round(total),
        categories: rows.map(r => ({
          category: r.category,
          amount: Math.round(Number(r._sum.amount)),
          count: r._count.id
        }))
      };
    }

    case 'getCashFlow': {
      const months = Math.min(args.months || 6, 24);
      const result = [];
      let running = 0;

      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);

        const [credits, debits] = await Promise.all([
          prisma.bankTransactionLog.aggregate({
            where: { bank_statement: { bank: { user_id: userId } }, transaction_date: { gte: start, lte: end }, net_amount: { gt: 0 }, user_approved: true },
            _sum: { net_amount: true }
          }),
          prisma.bankTransactionLog.aggregate({
            where: { bank_statement: { bank: { user_id: userId } }, transaction_date: { gte: start, lte: end }, net_amount: { lt: 0 }, user_approved: true },
            _sum: { net_amount: true }
          })
        ]);

        const net = Math.round(Number(credits._sum.net_amount || 0) + Number(debits._sum.net_amount || 0));
        running += net;
        result.push({ month: `${year}-${String(month).padStart(2, '0')}`, net, running_total: running });
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

      return {
        total_invested: Math.round(totalInvested),
        total_current: Math.round(totalCurrent),
        total_pnl: Math.round(totalCurrent - totalInvested),
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

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
