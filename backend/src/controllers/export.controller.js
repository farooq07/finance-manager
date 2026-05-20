import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { toCsv } from '../utils/csv.js';

function setCsvHeaders(res, filename) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

function setJsonDownloadHeaders(res, filename) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

function isoStamp() {
    return new Date().toISOString().slice(0, 10);
}

// GET /api/export/transactions.csv
// Unified view of bank + wallet transaction logs for the authed user.
export const exportTransactions = async (req, res) => {
    try {
        const userId = req.user.id;

        const [bankRows, walletRows] = await Promise.all([
            prisma.bankTransactionLog.findMany({
                where: { user_id: userId },
                orderBy: { transaction_date: 'desc' },
                include: { bank: { select: { name: true, currency: true } } },
            }),
            prisma.walletTransactionLog.findMany({
                where: { user_id: userId },
                orderBy: { transaction_date: 'desc' },
                include: { wallet: { select: { name: true, currency: true } } },
            }),
        ]);

        const unified = [
            ...bankRows.map((r) => ({
                source: 'bank',
                account: r.bank?.name || '',
                currency: r.bank?.currency || 'PKR',
                transaction_date: r.transaction_date,
                description: r.description,
                category: r.category,
                debit: r.debit,
                credit: r.credit,
                balance_after: r.balance_after,
                is_duplicate: r.is_duplicate,
                approved: r.approved,
            })),
            ...walletRows.map((r) => ({
                source: 'wallet',
                account: r.wallet?.name || '',
                currency: r.wallet?.currency || 'PKR',
                transaction_date: r.transaction_date,
                description: r.description,
                category: r.category,
                debit: r.debit,
                credit: r.credit,
                balance_after: r.balance_after,
                is_duplicate: r.is_duplicate,
                approved: r.approved,
            })),
        ].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

        const csv = toCsv(
            ['source', 'account', 'currency', 'transaction_date', 'description', 'category', 'debit', 'credit', 'balance_after', 'is_duplicate', 'approved'],
            unified,
            { headers: ['Source', 'Account', 'Currency', 'Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance', 'Duplicate', 'Approved'] }
        );

        setCsvHeaders(res, `transactions-${isoStamp()}.csv`);
        res.send(csv);
    } catch (error) {
        logger.error('[EXPORT] transactions failed:', error);
        res.status(500).json({ message: 'Could not export transactions' });
    }
};

// GET /api/export/expenses.csv
export const exportExpenses = async (req, res) => {
    try {
        const rows = await prisma.expense.findMany({
            where: { user_id: req.user.id },
            orderBy: { expense_date: 'desc' },
        });

        const csv = toCsv(
            ['expense_date', 'category', 'amount', 'description'],
            rows,
            { headers: ['Date', 'Category', 'Amount', 'Description'] }
        );

        setCsvHeaders(res, `expenses-${isoStamp()}.csv`);
        res.send(csv);
    } catch (error) {
        logger.error('[EXPORT] expenses failed:', error);
        res.status(500).json({ message: 'Could not export expenses' });
    }
};

// GET /api/export/dues.csv
export const exportDues = async (req, res) => {
    try {
        const rows = await prisma.duesTransaction.findMany({
            where: { user_id: req.user.id },
            orderBy: { transaction_date: 'desc' },
            include: { person: { select: { name: true } } },
        });

        const shaped = rows.map((r) => ({
            transaction_date: r.transaction_date,
            person: r.person?.name || '',
            type: r.type,
            amount: r.amount,
            description: r.description,
        }));

        const csv = toCsv(
            ['transaction_date', 'person', 'type', 'amount', 'description'],
            shaped,
            { headers: ['Date', 'Person', 'Type', 'Amount', 'Description'] }
        );

        setCsvHeaders(res, `dues-${isoStamp()}.csv`);
        res.send(csv);
    } catch (error) {
        logger.error('[EXPORT] dues failed:', error);
        res.status(500).json({ message: 'Could not export dues' });
    }
};

// GET /api/export/all.json
// Full portability dump. Heavier — fetches everything the user owns.
export const exportAll = async (req, res) => {
    try {
        const userId = req.user.id;

        const [
            user, banks, wallets, bankTxs, walletTxs, expenses, mutualFunds, stocks,
            stockTransactions, dividends, people, duesTransactions, rentEntries,
            assets, zakat, beneficiaries, institutions, brokerAccounts,
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, name: true, role: true, created_at: true, terms_accepted_at: true, privacy_accepted_at: true },
            }),
            prisma.bank.findMany({ where: { user_id: userId } }),
            prisma.wallet.findMany({ where: { user_id: userId } }),
            prisma.bankTransactionLog.findMany({ where: { user_id: userId } }),
            prisma.walletTransactionLog.findMany({ where: { user_id: userId } }),
            prisma.expense.findMany({ where: { user_id: userId } }),
            prisma.mutualFund.findMany({ where: { user_id: userId } }),
            prisma.stock.findMany({ where: { user_id: userId } }),
            prisma.stockTransaction.findMany({ where: { user_id: userId } }),
            prisma.dividend.findMany({ where: { user_id: userId } }),
            prisma.person.findMany({ where: { user_id: userId } }),
            prisma.duesTransaction.findMany({ where: { user_id: userId } }),
            prisma.rentEntry.findMany({ where: { user_id: userId } }),
            prisma.asset.findMany({ where: { user_id: userId } }),
            prisma.zakat.findMany({ where: { user_id: userId } }),
            prisma.beneficiary.findMany({ where: { user_id: userId } }),
            prisma.institution.findMany({ where: { user_id: userId } }),
            prisma.brokerAccount.findMany({ where: { user_id: userId } }),
        ]);

        const payload = {
            exported_at: new Date().toISOString(),
            format_version: 1,
            user,
            banks,
            wallets,
            bank_transactions: bankTxs,
            wallet_transactions: walletTxs,
            expenses,
            mutual_funds: mutualFunds,
            stocks,
            stock_transactions: stockTransactions,
            dividends,
            people,
            dues_transactions: duesTransactions,
            rent_entries: rentEntries,
            assets,
            zakat,
            beneficiaries,
            institutions,
            broker_accounts: brokerAccounts,
        };

        setJsonDownloadHeaders(res, `fswealth-axis-export-${isoStamp()}.json`);
        res.send(JSON.stringify(payload, null, 2));
    } catch (error) {
        logger.error('[EXPORT] full dump failed:', error);
        res.status(500).json({ message: 'Could not export full data' });
    }
};
