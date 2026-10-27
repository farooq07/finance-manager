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

// Transaction logs have no user_id: ownership is statement → bank/wallet → user.
const ownBankLogs = (userId) => ({ bank_statement: { bank: { user_id: userId } } });
const ownWalletLogs = (userId) => ({ wallet_statement: { wallet: { user_id: userId } } });

// Statement columns safe to export — never the encrypted PDF password or the
// server file path.
const STATEMENT_EXPORT_SELECT = {
    id: true, month: true, year: true, upload_date: true, opening_balance: true, closing_balance: true,
    total_credits: true, total_debits: true, transaction_count: true, processing_status: true,
};

function logToRow(source, account, r) {
    return {
        source,
        account: account?.name || '',
        currency: account?.currency || 'PKR',
        transaction_date: r.transaction_date,
        description: r.description,
        category: r.approved_category || r.suggested_category || '',
        debit: r.debit_amount,
        credit: r.credit_amount,
        status: r.processing_status,
        is_duplicate: r.is_duplicate,
        approved: r.user_approved,
    };
}

// GET /api/export/transactions.csv
// Unified view of bank + wallet transaction logs for the authed user.
export const exportTransactions = async (req, res) => {
    try {
        const userId = req.user.id;

        const [bankRows, walletRows] = await Promise.all([
            prisma.bankTransactionLog.findMany({
                where: ownBankLogs(userId),
                orderBy: { transaction_date: 'desc' },
                include: { bank_statement: { select: { bank: { select: { name: true, currency: true } } } } },
            }),
            prisma.walletTransactionLog.findMany({
                where: ownWalletLogs(userId),
                orderBy: { transaction_date: 'desc' },
                include: { wallet_statement: { select: { wallet: { select: { name: true, currency: true } } } } },
            }),
        ]);

        const unified = [
            ...bankRows.map((r) => logToRow('bank', r.bank_statement?.bank, r)),
            ...walletRows.map((r) => logToRow('wallet', r.wallet_statement?.wallet, r)),
        ].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

        const csv = toCsv(
            ['source', 'account', 'currency', 'transaction_date', 'description', 'category', 'debit', 'credit', 'status', 'is_duplicate', 'approved'],
            unified,
            { headers: ['Source', 'Account', 'Currency', 'Date', 'Description', 'Category', 'Debit', 'Credit', 'Status', 'Duplicate', 'Approved'] }
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
            ['expense_date', 'category', 'amount', 'payment_method', 'notes'],
            rows,
            { headers: ['Date', 'Category', 'Amount', 'Payment method', 'Notes'] }
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
            type: r.transaction_type,
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
// Full portability dump of everything the user owns. Credentials are never
// included: password/PIN hashes, OTPs, statement passwords, broker PINs and
// the Gold Vault PIN stay on the server.
export const exportAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const own = { where: { user_id: userId } };

        const [
            user, banks, wallets, bankStatements, walletStatements, bankTxs, walletTxs,
            expenses, mutualFunds, stocks, stockTransactions, dividends, psxSnapshots,
            portfolioSnapshots, bankInvestments, watchlist, people, duesTransactions,
            rentEntries, assets, goldItems, debts, debtPayments, recurringPayments,
            zakat, beneficiaries, institutions, brokerAccounts, netWorthSnapshots,
            chatSessions, chatDocuments, categoryPatterns,
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true, email: true, name: true, role: true, created_at: true,
                    terms_accepted_at: true, privacy_accepted_at: true, onboarded_at: true, interests: true,
                },
            }),
            prisma.bank.findMany(own),
            prisma.wallet.findMany(own),
            prisma.bankStatement.findMany({ where: { bank: { user_id: userId } }, select: { ...STATEMENT_EXPORT_SELECT, bank_id: true } }),
            prisma.walletStatement.findMany({ where: { wallet: { user_id: userId } }, select: { ...STATEMENT_EXPORT_SELECT, wallet_id: true } }),
            prisma.bankTransactionLog.findMany({ where: ownBankLogs(userId) }),
            prisma.walletTransactionLog.findMany({ where: ownWalletLogs(userId) }),
            prisma.expense.findMany(own),
            prisma.mutualFund.findMany(own),
            prisma.stock.findMany(own),
            prisma.stockTransaction.findMany(own),
            prisma.dividend.findMany(own),
            prisma.psxSnapshot.findMany(own),
            prisma.portfolioSnapshot.findMany(own),
            prisma.bankInvestment.findMany(own),
            prisma.watchlist.findMany(own),
            prisma.person.findMany(own),
            prisma.duesTransaction.findMany(own),
            prisma.rentEntry.findMany(own),
            prisma.asset.findMany(own),
            prisma.goldItem.findMany(own),
            prisma.debt.findMany(own),
            prisma.debtPayment.findMany(own),
            prisma.recurringPayment.findMany(own),
            prisma.zakat.findMany(own),
            prisma.beneficiary.findMany({ ...own, include: { accounts: true, transactions: true } }),
            prisma.institution.findMany(own),
            prisma.brokerAccount.findMany({
                ...own,
                select: { id: true, account_title: true, client_code: true, participant_acc_no: true, cdc_sub_acc_no: true, created_at: true },
            }),
            prisma.netWorthSnapshot.findMany(own),
            prisma.chatSession.findMany({ ...own, include: { messages: { orderBy: { created_at: 'asc' } } } }),
            prisma.chatDocument.findMany({ ...own, select: { id: true, filename: true, mime_type: true, char_count: true, created_at: true } }),
            prisma.categoryPattern.findMany(own),
        ]);

        const payload = {
            exported_at: new Date().toISOString(),
            format_version: 2,
            user,
            banks,
            wallets,
            bank_statements: bankStatements,
            wallet_statements: walletStatements,
            bank_transactions: bankTxs,
            wallet_transactions: walletTxs,
            expenses,
            mutual_funds: mutualFunds,
            stocks,
            stock_transactions: stockTransactions,
            dividends,
            psx_snapshots: psxSnapshots,
            mutual_fund_snapshots: portfolioSnapshots,
            brokerage_cashflows: bankInvestments,
            watchlist,
            people,
            dues_transactions: duesTransactions,
            rent_entries: rentEntries,
            assets,
            gold_items: goldItems,
            debts,
            debt_payments: debtPayments,
            recurring_payments: recurringPayments,
            zakat,
            beneficiaries,
            institutions,
            broker_accounts: brokerAccounts,
            networth_snapshots: netWorthSnapshots,
            chat_sessions: chatSessions,
            chat_documents: chatDocuments,
            category_rules: categoryPatterns,
        };

        setJsonDownloadHeaders(res, `fswealth-axis-export-${isoStamp()}.json`);
        res.send(JSON.stringify(payload, null, 2));
    } catch (error) {
        logger.error('[EXPORT] full dump failed:', error);
        res.status(500).json({ message: 'Could not export full data' });
    }
};
