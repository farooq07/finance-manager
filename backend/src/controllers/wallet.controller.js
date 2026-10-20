import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';
import { extractPdfText, getFileHash } from '../services/pdfParser.service.js';
import { parseTransactions, validateBalance, parseStatementBalances } from '../services/transactionParser.service.js';
import { parseCsvTransactions, inspectCsv, parseCsvWithMapping } from '../services/csvParser.service.js';
import { reconcile, importGate } from '../services/reconcile.service.js';
import { categorizeTransactionBatch, recordUserCategory } from '../services/categorizer.service.js';
import { findWalletDuplicates, isWalletFilePreviouslyImported, markAsDuplicate } from '../services/duplicateDetector.service.js';
import fs from 'fs';
import path from 'path';

const WALLET_STATEMENTS_DIR = 'uploads/wallet-statements';

function resolveWalletUploadPath(uploadId) {
    const base = path.basename(String(uploadId || ''));
    if (!base || base !== uploadId) return null;
    const full = path.join(WALLET_STATEMENTS_DIR, base);
    if (!fs.existsSync(full)) return null;
    return full;
}

function isCsvName(name = '') {
    return name.toLowerCase().endsWith('.csv');
}

// ─── Wallet transaction management ────────────────────────────────────────────

export const getAllTransactions = async (req, res) => {
    try {
        const { walletId } = req.params;
        const wallet = await prisma.wallet.findUnique({ where: { id: walletId, user_id: req.user.id } });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        const transactions = await prisma.walletTransactionLog.findMany({
            where: { wallet_statement: { wallet_id: walletId } },
            orderBy: { transaction_date: 'desc' }
        });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch transactions' });
    }
};

export const updateTransactionCategory = async (req, res) => {
    try {
        const { walletId, txId } = req.params;
        const { approvedCategory, notes, transaction_type, amount } = req.body;

        const wallet = await prisma.wallet.findUnique({ where: { id: walletId, user_id: req.user.id } });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        const txLog = await prisma.walletTransactionLog.findFirst({
            where: { id: txId, wallet_statement: { wallet_id: walletId } }
        });
        if (!txLog) return res.status(404).json({ message: 'Transaction not found' });

        const updateData = {};

        // Apply category/notes if provided
        if (approvedCategory) {
            updateData.approved_category = approvedCategory;
            updateData.suggested_category = approvedCategory;
        }
        if (notes !== undefined) updateData.notes = notes;

        // Apply amount correction if provided
        if (amount != null) {
            const correctedAbs = Math.abs(Number(amount));
            const isCredit = transaction_type
                ? transaction_type === 'credit'
                : Number(txLog.net_amount) > 0;
            updateData.net_amount = isCredit ? correctedAbs : -correctedAbs;
            updateData.debit_amount = isCredit ? null : correctedAbs;
            updateData.credit_amount = isCredit ? correctedAbs : null;
        }

        // Apply type correction if requested (without amount — flips sign of existing amount)
        if (transaction_type && amount == null) {
            const currentIsCredit = Number(txLog.net_amount) > 0;
            const wantsCredit = transaction_type === 'credit';

            if (currentIsCredit !== wantsCredit) {
                const absAmount = Math.abs(Number(txLog.net_amount));
                updateData.net_amount = wantsCredit ? absAmount : -absAmount;
                updateData.debit_amount = wantsCredit ? null : absAmount;
                updateData.credit_amount = wantsCredit ? absAmount : null;

                if (txLog.created_expense_id && wantsCredit) {
                    await prisma.expense.deleteMany({
                        where: { id: txLog.created_expense_id, user_id: req.user.id }
                    });
                    updateData.created_expense_id = null;
                }
            }
        }

        await prisma.walletTransactionLog.update({ where: { id: txId }, data: updateData });

        // Sync linked expense category / notes / amount
        if (txLog.created_expense_id) {
            const expenseUpdate = {};
            if (approvedCategory) expenseUpdate.category = approvedCategory;
            if (notes !== undefined) expenseUpdate.notes = notes;
            if (amount != null) expenseUpdate.amount = Math.abs(Number(amount));
            if (Object.keys(expenseUpdate).length > 0) {
                await prisma.expense.update({
                    where: { id: txLog.created_expense_id },
                    data: expenseUpdate
                });
            }
        }

        if (approvedCategory) {
            await recordUserCategory(req.user.id, txLog.description, approvedCategory);
        }

        res.json({ message: 'Transaction updated' });
    } catch (error) {
        console.error('Error updating wallet transaction:', error);
        res.status(500).json({ message: 'Failed to update transaction' });
    }
};

export const deleteTransaction = async (req, res) => {
    try {
        const { walletId, txId } = req.params;
        const wallet = await prisma.wallet.findUnique({ where: { id: walletId, user_id: req.user.id } });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        const txLog = await prisma.walletTransactionLog.findFirst({
            where: { id: txId, wallet_statement: { wallet_id: walletId } }
        });
        if (!txLog) return res.status(404).json({ message: 'Transaction not found' });

        if (txLog.created_expense_id) {
            await prisma.expense.deleteMany({ where: { id: txLog.created_expense_id, user_id: req.user.id } });
        }
        await prisma.walletTransactionLog.delete({ where: { id: txId } });
        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete transaction' });
    }
};

export const bulkApproveTransactions = async (req, res) => {
    try {
        const { walletId } = req.params;
        const { transactions: items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'No transactions provided' });
        }

        const wallet = await prisma.wallet.findUnique({ where: { id: walletId, user_id: req.user.id } });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        const txIds = items.map(i => i.txId);
        const txLogs = await prisma.walletTransactionLog.findMany({
            where: { id: { in: txIds }, wallet_statement: { wallet_id: walletId } }
        });
        const txMap = new Map(txLogs.map(t => [t.id, t]));

        let successCount = 0;
        const errors = [];

        await Promise.all(items.map(async ({ txId, approvedCategory }) => {
            const txLog = txMap.get(txId);
            if (!txLog || txLog.processing_status === 'approved') return;

            const category = approvedCategory || txLog.suggested_category || 'Other';
            const isCredit = Number(txLog.net_amount) > 0;
            try {
                let expenseId = null;
                if (!isCredit) {
                    const expense = await prisma.expense.create({
                        data: {
                            user_id: req.user.id,
                            amount: Math.abs(Number(txLog.net_amount)),
                            category,
                            expense_date: txLog.transaction_date,
                            payment_method: 'Wallet',
                            notes: txLog.description
                        }
                    });
                    expenseId = expense.id;
                }
                await prisma.walletTransactionLog.update({
                    where: { id: txId },
                    data: { user_approved: true, approved_category: category, created_expense_id: expenseId, processing_status: 'approved' }
                });
                await recordUserCategory(req.user.id, txLog.description, category);
                successCount++;
            } catch (err) {
                errors.push(txId);
            }
        }));

        res.json({ message: `Approved ${successCount} transactions`, successCount, errors });
    } catch (err) {
        console.error('Error bulk approving wallet transactions:', err);
        res.status(500).json({ message: 'Failed to bulk approve' });
    }
};

function isCsv(file) {
    return file.mimetype === 'text/csv'
        || file.mimetype === 'application/csv'
        || file.mimetype === 'application/vnd.ms-excel'
        || file.originalname?.toLowerCase().endsWith('.csv');
}

export const getWallets = async (req, res) => {
    try {
        const wallets = await prisma.wallet.findMany({
            where: { user_id: req.user.id },
            include: {
                statements: {
                    orderBy: { upload_date: 'desc' }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(wallets);
    } catch (error) {
        console.error('Error fetching wallets:', error);
        res.status(500).json({ message: 'Server error fetching wallets' });
    }
};

export const createWallet = async (req, res) => {
    try {
        const { name, institution, balance, color_theme, account_num, currency, exchange_rate } = req.body;

        const wallet = await prisma.wallet.create({
            data: {
                user_id: req.user.id,
                name,
                institution,
                balance,
                currency: currency || 'PKR',
                exchange_rate: exchange_rate != null ? Number(exchange_rate) : 1.00,
                color_theme: color_theme || 'blue',
                account_num
            }
        });

        res.status(201).json(wallet);
    } catch (error) {
        console.error('Error creating wallet:', error);
        res.status(500).json({ message: 'Server error creating wallet' });
    }
};

export const updateWalletBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { balance } = req.body;

        const wallet = await prisma.wallet.findUnique({ where: { id } });

        if (!wallet || wallet.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        const updatedWallet = await prisma.wallet.update({
            where: { id },
            data: { balance: Number(balance) }
        });

        res.json(updatedWallet);
    } catch (error) {
        console.error('Error updating wallet:', error);
        res.status(500).json({ message: 'Server error updating wallet' });
    }
};

export const deleteWallet = async (req, res) => {
    try {
        const { id } = req.params;

        const wallet = await prisma.wallet.findUnique({ where: { id } });

        if (!wallet || wallet.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        await prisma.wallet.delete({ where: { id } });

        res.json({ message: 'Wallet deleted successfully' });
    } catch (error) {
        console.error('Error deleting wallet:', error);
        res.status(500).json({ message: 'Server error deleting wallet' });
    }
};

/**
 * Upload and parse wallet statement
 * POST /api/wallets/:walletId/statements/upload
 */
export const uploadStatement = async (req, res) => {
    let filePath = null;

    try {
        const { walletId } = req.params;
        const { password } = req.body;

        logger.log('[WALLET_STATEMENT] Upload request:', {
            walletId,
            hasFile: !!req.file,
            fileName: req.file?.originalname,
            hasPassword: !!password
        });

        const wallet = await prisma.wallet.findUnique({
            where: { id: walletId, user_id: req.user.id }
        });

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        filePath = req.file.path;
        logger.log('[WALLET_STATEMENT] File saved at:', filePath);

        let fileHash = '';
        let rawText = '';
        let pageCount = 1;
        let parsedTxs = [];
        const fileIsCsv = isCsv(req.file);

        try {
            logger.log('[WALLET_STATEMENT] Checking for duplicate file...');
            fileHash = getFileHash(filePath);
            const isDuplicate = await isWalletFilePreviouslyImported(req.user.id, fileHash, walletId);
            const forceReplace = req.body?.force === 'true' || req.query?.force === 'true';

            if (isDuplicate) {
                // Find the existing statement so we can decide what to do with it.
                const existing = await prisma.walletStatement.findFirst({
                    where: { wallet_id: walletId, file_hash: fileHash },
                    select: { id: true, month: true, year: true, transaction_count: true, upload_date: true, file_path: true },
                });

                // Auto-clean: the previous import created a row with zero transactions
                // (parser failed silently). Treat it as a recoverable failure and replace
                // it transparently — no user confirmation needed.
                const isEmptyFailedImport = existing && (existing.transaction_count ?? 0) === 0;

                if (isEmptyFailedImport || forceReplace) {
                    try {
                        if (existing?.file_path && fs.existsSync(existing.file_path)) {
                            fs.unlinkSync(existing.file_path);
                        }
                        await prisma.walletStatement.delete({ where: { id: existing.id } });
                        logger.log('[WALLET_STATEMENT] Replaced previous statement:', existing.id, '(reason:', isEmptyFailedImport ? 'empty-failed' : 'force-replace', ')');
                    } catch (cleanupErr) {
                        logger.log('[WALLET_STATEMENT] Cleanup of previous statement failed:', cleanupErr.message);
                    }
                    // Fall through to normal parsing path.
                } else {
                    // Existing record has data — let the frontend prompt the user.
                    fs.unlinkSync(filePath);
                    return res.status(409).json({
                        message: 'This statement was already imported.',
                        duplicate: true,
                        existing: {
                            id: existing.id,
                            month: existing.month,
                            year: existing.year,
                            transactionCount: existing.transaction_count,
                            uploadedAt: existing.upload_date,
                        },
                    });
                }
            }

            if (fileIsCsv) {
                logger.log('[WALLET_STATEMENT] Parsing CSV...');
                try {
                    const csvResult = parseCsvTransactions(filePath);
                    parsedTxs = csvResult.transactions;
                    logger.log('[WALLET_STATEMENT] CSV parsed:', parsedTxs.length, 'transactions');
                } catch (csvError) {
                    fs.unlinkSync(filePath);
                    return res.status(400).json({ message: csvError.message });
                }
            } else {
                logger.log('[WALLET_STATEMENT] Extracting text from PDF...');
                try {
                    const pdfData = await extractPdfText(filePath, password);
                    rawText = pdfData.rawText;
                    pageCount = pdfData.pageCount;
                    logger.log('[WALLET_STATEMENT] PDF extracted, text length:', rawText.length);
                } catch (pdfError) {
                    console.error('[WALLET_STATEMENT] PDF extraction error:', pdfError.message);
                    rawText = '';
                }

                logger.log('[WALLET_STATEMENT] Parsing transactions...');
                try {
                    parsedTxs = rawText ? parseTransactions(rawText) : [];
                    logger.log('[WALLET_STATEMENT] Parsed transactions count:', parsedTxs.length);
                } catch (parseError) {
                    console.error('[WALLET_STATEMENT] Transaction parsing error:', parseError.message);
                    parsedTxs = [];
                }
            }
        } catch (preprocessError) {
            console.error('[WALLET_STATEMENT] Preprocessing error:', preprocessError);
        }

        logger.log('[WALLET_STATEMENT] Creating wallet statement record...');

        let month = new Date().toLocaleString('en-US', { month: 'long' });
        let year = new Date().getFullYear();

        if (parsedTxs.length > 0 && parsedTxs[0].transaction_date) {
            const txDate = new Date(parsedTxs[0].transaction_date);
            month = txDate.toLocaleString('en-US', { month: 'long' });
            year = txDate.getFullYear();
        }

        // Extract balances: prefer per-row running balance column, fall back to summary lines
        let openingBalance = null;
        let closingBalance = null;

        if (parsedTxs.length > 0) {
            const withBalance = parsedTxs.filter(tx => tx.balance != null);
            if (withBalance.length > 0) {
                const sorted = [...withBalance].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
                openingBalance = sorted[0].balance;
                closingBalance = sorted[sorted.length - 1].balance;
            }
        }

        if (closingBalance === null && rawText) {
            const parsed = parseStatementBalances(rawText);
            openingBalance = openingBalance ?? parsed.opening;
            closingBalance = parsed.closing;
        }

        logger.log('[WALLET_STATEMENT] Balances — opening:', openingBalance, 'closing:', closingBalance);

        const walletStatement = await prisma.walletStatement.create({
            data: {
                wallet_id: walletId,
                month,
                year,
                file_path: filePath,
                file_hash: fileHash,
                password_encrypted: encryptSecret(password),
                transaction_count: parsedTxs.length,
                processing_status: 'pending',
                opening_balance: openingBalance !== null ? openingBalance : undefined,
                closing_balance: closingBalance !== null ? closingBalance : undefined,
            }
        });

        // Sync wallet balance with closing balance from statement
        if (closingBalance !== null) {
            await prisma.wallet.update({
                where: { id: walletId },
                data: { balance: closingBalance }
            });
            logger.log('[WALLET_STATEMENT] Updated wallet balance to', closingBalance);
        }

        logger.log('[WALLET_STATEMENT] Checking for duplicates and categorizing...');
        let duplicateMap = new Map();
        let transactionLogs = [];

        if (parsedTxs.length > 0) {
            try {
                duplicateMap = await findWalletDuplicates(req.user.id, walletStatement.id, parsedTxs);
            } catch (dupError) {
                console.error('[WALLET_STATEMENT] Duplicate detection error:', dupError.message);
                duplicateMap = new Map();
            }

            let categorizations = [];
            try {
                categorizations = await categorizeTransactionBatch(req.user.id, parsedTxs);
            } catch (catError) {
                console.error('[WALLET_STATEMENT] Batch categorization error:', catError.message);
                categorizations = parsedTxs.map(() => ({ category: 'Other', confidence: 0, method: 'default' }));
            }

            for (let i = 0; i < parsedTxs.length; i++) {
                try {
                    const tx = parsedTxs[i];
                    const isDupTx = duplicateMap.has(i);
                    const categorization = categorizations[i] || { category: 'Other', confidence: 0 };

                    const txLog = await prisma.walletTransactionLog.create({
                        data: {
                            wallet_statement_id: walletStatement.id,
                            transaction_date: tx.transaction_date,
                            description: tx.description,
                            debit_amount: tx.debit_amount || null,
                            credit_amount: tx.credit_amount || null,
                            net_amount: tx.net_amount,
                            suggested_category: categorization.category,
                            category_confidence: categorization.confidence,
                            is_duplicate: isDupTx,
                            duplicate_of_id: isDupTx ? duplicateMap.get(i).duplicateOfId : null,
                            processing_status: isDupTx ? 'rejected' : 'pending'
                        }
                    });

                    transactionLogs.push(txLog);
                } catch (txError) {
                    console.error('[WALLET_STATEMENT] Error creating transaction log:', txError.message);
                }
            }
        }

        logger.log(`[WALLET_STATEMENT] Imported ${transactionLogs.length} transactions (${duplicateMap.size} duplicates)`);

        res.status(201).json({
            message: 'Statement uploaded and processed',
            statementId: walletStatement.id,
            summary: {
                totalParsed: parsedTxs.length,
                duplicates: duplicateMap.size,
                unique: parsedTxs.length - duplicateMap.size,
                pageCount
            },
            transactions: transactionLogs
        });

    } catch (error) {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        console.error('[WALLET_STATEMENT] Upload failed:', error);
        console.error('[WALLET_STATEMENT] Error stack:', error.stack);

        res.status(500).json({
            message: 'Failed to process statement',
            error: error.message,
            details: error.meta?.cause || error.code
        });
    }
};

/**
 * Shared finaliser for the wallet mapping/commit flow.
 */
async function finalizeWalletImport({ userId, walletId, parsedTxs, openingBalance, closingBalance, filePath, fileHash, password }) {
    let month = new Date().toLocaleString('en-US', { month: 'long' });
    let year = new Date().getFullYear();
    if (parsedTxs.length > 0) {
        const sorted = [...parsedTxs].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
        const d = new Date(sorted[0].transaction_date);
        month = d.toLocaleString('en-US', { month: 'long' });
        year = d.getFullYear();
    }

    const statement = await prisma.walletStatement.create({
        data: {
            wallet_id: walletId,
            month,
            year,
            file_path: filePath,
            file_hash: fileHash,
            password_encrypted: encryptSecret(password || ''),
            transaction_count: parsedTxs.length,
            processing_status: 'pending',
            opening_balance: openingBalance !== null && openingBalance !== undefined ? openingBalance : undefined,
            closing_balance: closingBalance !== null && closingBalance !== undefined ? closingBalance : undefined,
        },
    });

    if (closingBalance !== null && closingBalance !== undefined) {
        await prisma.wallet.update({ where: { id: walletId }, data: { balance: closingBalance } });
    }

    let duplicateMap = new Map();
    const transactionLogs = [];

    if (parsedTxs.length > 0) {
        try {
            duplicateMap = await findWalletDuplicates(userId, statement.id, parsedTxs);
        } catch (e) { console.error('[WALLET_COMMIT] dup error:', e.message); }

        let categorizations = [];
        try {
            categorizations = await categorizeTransactionBatch(userId, parsedTxs);
        } catch (e) {
            categorizations = parsedTxs.map(() => ({ category: 'Other', confidence: 0 }));
        }

        for (let i = 0; i < parsedTxs.length; i++) {
            try {
                const tx = parsedTxs[i];
                const isDupTx = duplicateMap.has(i);
                const cat = categorizations[i] || { category: 'Other', confidence: 0 };
                const txLog = await prisma.walletTransactionLog.create({
                    data: {
                        wallet_statement_id: statement.id,
                        transaction_date: tx.transaction_date,
                        description: tx.description,
                        debit_amount: tx.debit_amount || null,
                        credit_amount: tx.credit_amount || null,
                        net_amount: tx.net_amount,
                        suggested_category: cat.category,
                        category_confidence: cat.confidence,
                        is_duplicate: isDupTx,
                        duplicate_of_id: isDupTx ? duplicateMap.get(i).duplicateOfId : null,
                        processing_status: isDupTx ? 'rejected' : 'pending',
                    },
                });
                transactionLogs.push(txLog);
            } catch (e) { console.error('[WALLET_COMMIT] log error:', e.message); }
        }
    }

    return { statement, transactionLogs, duplicateCount: duplicateMap.size };
}

/**
 * Step 1 — inspect an uploaded wallet statement (CSV columns / PDF rows).
 * POST /api/wallets/:walletId/statements/preview
 */
export const previewStatement = async (req, res) => {
    let filePath = null;
    try {
        const { walletId } = req.params;
        const { password } = req.body;

        const wallet = await prisma.wallet.findUnique({ where: { id: walletId, user_id: req.user.id } });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
        if (!req.file) return res.status(400).json({ message: 'No file provided' });

        filePath = req.file.path;
        const uploadId = path.basename(filePath);
        const fileHash = getFileHash(filePath);
        const alreadyImported = await isWalletFilePreviouslyImported(req.user.id, fileHash, walletId);

        if (isCsvName(req.file.originalname) || isCsv(req.file)) {
            const preview = inspectCsv(filePath);
            return res.json({ type: 'csv', uploadId, alreadyImported, ...preview });
        }

        let rawText = '';
        try {
            const pdf = await extractPdfText(filePath, password);
            rawText = pdf.rawText || '';
        } catch (e) {
            // Missing/wrong password or not a PDF: the user can fix these.
            if (e.code?.startsWith('PDF_')) throw e;
            logger.log('[WALLET_PREVIEW] PDF extract failed:', e.message);
        }

        const transactions = rawText ? parseTransactions(rawText) : [];
        const balances = rawText ? parseStatementBalances(rawText) : { opening: null, closing: null };
        const recon = reconcile(transactions, balances.opening, balances.closing);

        return res.json({
            type: 'pdf', uploadId, alreadyImported,
            transactions, opening: balances.opening, closing: balances.closing, reconciliation: recon,
        });
    } catch (error) {
        if (filePath && fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch { /* ignore */ } }
        console.error('[WALLET_PREVIEW] failed:', error);
        return res.status(400).json({
            message: error.message || 'Failed to preview statement',
            ...(error.code?.startsWith('PDF_') ? { code: error.code } : {}),
        });
    }
};

/**
 * Step 2 — commit with the confirmed mapping (CSV) or reviewed rows (PDF).
 * POST /api/wallets/:walletId/statements/commit
 */
export const commitStatement = async (req, res) => {
    try {
        const { walletId } = req.params;
        const { uploadId, type, mapping, transactions: reviewedTxs, opening, closing, password, force, acceptMismatch } = req.body;

        const wallet = await prisma.wallet.findUnique({ where: { id: walletId, user_id: req.user.id } });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        const filePath = resolveWalletUploadPath(uploadId);
        if (!filePath) return res.status(400).json({ message: 'Upload not found or expired. Please re-upload the file.' });

        const fileHash = getFileHash(filePath);
        const isDuplicate = await isWalletFilePreviouslyImported(req.user.id, fileHash, walletId);
        if (isDuplicate) {
            const existing = await prisma.walletStatement.findFirst({
                where: { wallet_id: walletId, file_hash: fileHash },
                select: { id: true, month: true, year: true, transaction_count: true, upload_date: true, file_path: true },
            });
            const isEmptyFailed = existing && (existing.transaction_count ?? 0) === 0;
            if (isEmptyFailed || force === true || force === 'true') {
                try {
                    if (existing?.file_path && existing.file_path !== filePath && fs.existsSync(existing.file_path)) fs.unlinkSync(existing.file_path);
                    if (existing) await prisma.walletStatement.delete({ where: { id: existing.id } });
                } catch (e) { logger.log('[WALLET_COMMIT] cleanup failed:', e.message); }
            } else {
                return res.status(409).json({
                    message: 'This statement was already imported.',
                    duplicate: true,
                    existing: existing ? { id: existing.id, month: existing.month, year: existing.year, transactionCount: existing.transaction_count, uploadedAt: existing.upload_date } : null,
                });
            }
        }

        let parsedTxs = [];
        let openingBalance = null;
        let closingBalance = null;

        if (type === 'csv') {
            const result = parseCsvWithMapping(filePath, mapping || {});
            parsedTxs = result.transactions;
            openingBalance = result.openingBalance;
            closingBalance = result.closingBalance;
        } else {
            parsedTxs = (Array.isArray(reviewedTxs) ? reviewedTxs : [])
                .map((t) => {
                    const debit = Number(t.debit_amount) || 0;
                    const credit = Number(t.credit_amount) || 0;
                    const net = t.net_amount != null ? Number(t.net_amount) : (credit - debit);
                    return {
                        transaction_date: new Date(t.transaction_date),
                        description: String(t.description || '').slice(0, 255),
                        debit_amount: debit > 0 ? debit : null,
                        credit_amount: credit > 0 ? credit : null,
                        net_amount: net,
                        balance: t.balance != null ? Number(t.balance) : null,
                    };
                })
                .filter((t) => t.transaction_date && !isNaN(t.transaction_date) && t.net_amount !== 0);
            openingBalance = opening != null ? Number(opening) : null;
            closingBalance = closing != null ? Number(closing) : null;
        }

        if (parsedTxs.length === 0) {
            return res.status(400).json({ message: 'No valid transactions to import after parsing.' });
        }

        const reconciliation = reconcile(parsedTxs, openingBalance, closingBalance);
        const blocked = importGate(reconciliation, acceptMismatch);
        if (blocked) return res.status(blocked.status).json(blocked.body);

        const { statement, transactionLogs, duplicateCount } = await finalizeWalletImport({
            userId: req.user.id, walletId, parsedTxs, openingBalance, closingBalance, filePath, fileHash, password,
        });

        return res.status(201).json({
            message: 'Statement imported',
            statementId: statement.id,
            reconciliation,
            summary: { totalParsed: parsedTxs.length, duplicates: duplicateCount, unique: parsedTxs.length - duplicateCount },
            transactions: transactionLogs,
        });
    } catch (error) {
        console.error('[WALLET_COMMIT] failed:', error);
        return res.status(500).json({ message: error.message || 'Failed to import statement' });
    }
};

/**
 * Get transactions from a wallet statement
 */
export const getStatementTransactions = async (req, res) => {
    try {
        const { walletId, statementId } = req.params;

        const wallet = await prisma.wallet.findUnique({
            where: { id: walletId, user_id: req.user.id }
        });

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        const transactions = await prisma.walletTransactionLog.findMany({
            where: {
                wallet_statement_id: statementId,
                wallet_statement: { wallet_id: walletId }
            },
            orderBy: { transaction_date: 'asc' }
        });

        res.json(transactions);
    } catch (error) {
        console.error('Error fetching statement transactions:', error);
        res.status(500).json({ message: 'Failed to fetch transactions' });
    }
};

/**
 * Approve a transaction and convert to Expense
 */
export const approveTransaction = async (req, res) => {
    try {
        const { walletId, txId } = req.params;
        const { approvedCategory, notes } = req.body;

        const wallet = await prisma.wallet.findUnique({
            where: { id: walletId, user_id: req.user.id }
        });

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        const txLog = await prisma.walletTransactionLog.findFirst({
            where: { id: txId, wallet_statement: { wallet_id: walletId } }
        });

        if (!txLog) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Learn from user's choice
        if (approvedCategory) {
            await recordUserCategory(req.user.id, txLog.description, approvedCategory);
        }

        const isCredit = Number(txLog.net_amount) > 0;

        // Only create an Expense for debit (outgoing) transactions
        let expenseId = null;
        if (!isCredit) {
            const expense = await prisma.expense.create({
                data: {
                    user_id: req.user.id,
                    amount: Math.abs(txLog.net_amount),
                    category: approvedCategory || txLog.suggested_category || 'Other',
                    expense_date: txLog.transaction_date,
                    payment_method: 'Wallet',
                    notes: notes || txLog.description
                }
            });
            expenseId = expense.id;
        }

        await prisma.walletTransactionLog.update({
            where: { id: txId },
            data: {
                user_approved: true,
                approved_category: approvedCategory,
                created_expense_id: expenseId,
                processing_status: 'approved',
                notes
            }
        });

        res.json({ message: 'Transaction approved', expenseId, isCredit });
    } catch (error) {
        console.error('Error approving transaction:', error);
        res.status(500).json({ message: 'Failed to approve transaction' });
    }
};

/**
 * Delete a wallet statement and all its transactions
 * DELETE /api/wallets/:walletId/statements/:statementId
 */
export const deleteStatement = async (req, res) => {
    try {
        const { walletId, statementId } = req.params;

        const wallet = await prisma.wallet.findUnique({
            where: { id: walletId, user_id: req.user.id }
        });

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        const statement = await prisma.walletStatement.findUnique({
            where: { id: statementId },
            include: { parsed_transactions: true }
        });

        if (!statement || statement.wallet_id !== walletId) {
            return res.status(404).json({ message: 'Statement not found' });
        }

        const linkedExpenseIds = statement.parsed_transactions
            .map(t => t.created_expense_id)
            .filter(Boolean);

        if (linkedExpenseIds.length > 0) {
            await prisma.expense.deleteMany({
                where: { id: { in: linkedExpenseIds }, user_id: req.user.id }
            });
        }

        if (statement.file_path && fs.existsSync(statement.file_path)) {
            try {
                fs.unlinkSync(statement.file_path);
            } catch (e) {
                console.warn('Could not delete wallet statement file:', e.message);
            }
        }

        await prisma.walletStatement.delete({ where: { id: statementId } });

        res.json({ message: 'Statement deleted successfully' });
    } catch (error) {
        console.error('Error deleting wallet statement:', error);
        res.status(500).json({ message: 'Failed to delete statement', error: error.message });
    }
};

/**
 * Re-parse a stored wallet statement file and sync the closing balance
 * POST /api/wallets/:walletId/statements/:statementId/sync
 */
export const syncStatementBalance = async (req, res) => {
    try {
        const { walletId, statementId } = req.params;

        const wallet = await prisma.wallet.findUnique({
            where: { id: walletId, user_id: req.user.id }
        });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        const statement = await prisma.walletStatement.findUnique({
            where: { id: statementId }
        });
        if (!statement || statement.wallet_id !== walletId) {
            return res.status(404).json({ message: 'Statement not found' });
        }

        if (!statement.file_path || !fs.existsSync(statement.file_path)) {
            return res.status(400).json({ message: 'Statement file no longer exists on disk' });
        }

        const isCsvFile = statement.file_path.toLowerCase().endsWith('.csv');
        let openingBalance = null;
        let closingBalance = null;

        if (isCsvFile) {
            const { parseCsvTransactions } = await import('../services/csvParser.service.js');
            const { transactions: parsedTxs } = parseCsvTransactions(statement.file_path);
            const withBalance = parsedTxs.filter(tx => tx.balance != null);
            if (withBalance.length > 0) {
                const sorted = [...withBalance].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
                openingBalance = sorted[0].balance;
                closingBalance = sorted[sorted.length - 1].balance;
            }
        } else {
            const password = decryptSecret(statement.password_encrypted) ?? undefined;
            const { rawText } = await extractPdfText(statement.file_path, password);

            const parsedTxs = rawText ? parseTransactions(rawText) : [];
            const withBalance = parsedTxs.filter(tx => tx.balance != null);
            if (withBalance.length > 0) {
                const sorted = [...withBalance].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
                openingBalance = sorted[0].balance;
                closingBalance = sorted[sorted.length - 1].balance;
            }

            if (closingBalance === null && rawText) {
                const parsed = parseStatementBalances(rawText);
                openingBalance = openingBalance ?? parsed.opening;
                closingBalance = parsed.closing;
            }
        }

        if (closingBalance === null) {
            return res.status(422).json({ message: 'Could not extract balance from this statement' });
        }

        await prisma.walletStatement.update({
            where: { id: statementId },
            data: {
                closing_balance: closingBalance,
                opening_balance: openingBalance !== null ? openingBalance : statement.opening_balance
            }
        });

        await prisma.wallet.update({
            where: { id: walletId },
            data: { balance: closingBalance }
        });

        res.json({ message: 'Balance synced', closingBalance, openingBalance });
    } catch (error) {
        console.error('Error syncing wallet statement balance:', error);
        res.status(500).json({ message: 'Failed to sync balance', error: error.message });
    }
};

