import prisma from '../utils/prisma.js';
import { approveImportedTransaction } from '../services/transactionApproval.service.js';
import logger from '../utils/logger.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';
import { extractPdfText, getFileHash } from '../services/pdfParser.service.js';
import { parseTransactions, validateBalance, parseStatementBalances } from '../services/transactionParser.service.js';
import { parseCsvTransactions, inspectCsv, parseCsvWithMapping } from '../services/csvParser.service.js';
import { reconcile, importGate } from '../services/reconcile.service.js';
import { recordUserCategory } from '../services/categorizer.service.js';
import { isFilePreviouslyImported } from '../services/duplicateDetector.service.js';
import { saveStatementImport, removeStatement } from '../services/statementImport.service.js';
import { openUploadSession, resolveUploadSession, claimUploadSession, releaseUploadSession } from '../services/uploadSession.service.js';
import { linkTransactionsToBeneficiaries } from './beneficiary.controller.js';
import fs from 'fs';
import path from 'path';

const STATEMENTS_DIR = 'uploads/statements';

function isCsvName(name = '') {
    return name.toLowerCase().endsWith('.csv');
}

function isCsv(file) {
    return file.mimetype === 'text/csv'
        || file.mimetype === 'application/csv'
        || file.mimetype === 'application/vnd.ms-excel'
        || file.originalname?.toLowerCase().endsWith('.csv');
}

export const createBank = async (req, res) => {
    try {
        const { name, account_no, iban_no, starting_balance } = req.body;

        const bank = await prisma.bank.create({
            data: {
                user_id: req.user.id,
                name,
                account_no,
                iban_no,
                starting_balance,
                current_balance: starting_balance, // Initially, current equals starting
                balance_as_of: new Date(),
                balance_source: 'opening',
            }
        });

        res.status(201).json(bank);
    } catch (error) {
        console.error('Error creating bank:', error);
        res.status(500).json({ message: 'Error creating bank' });
    }
};

export const getBanks = async (req, res) => {
    try {
        const banks = await prisma.bank.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' },
        });

        res.json(banks);
    } catch (error) {
        console.error('Error fetching banks:', error);
        res.status(500).json({ message: 'Error fetching banks' });
    }
};

export const getBankById = async (req, res) => {
    try {
        const { id } = req.params;
        const bank = await prisma.bank.findUnique({
            where: { id, user_id: req.user.id },
            include: { statements: true }
        });

        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        res.json(bank);
    } catch (error) {
        console.error('Error fetching bank:', error);
        res.status(500).json({ message: 'Error fetching bank details' });
    }
};

export const updateBank = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, account_no, iban_no, starting_balance, currency, exchange_rate } = req.body;

        const bank = await prisma.bank.findUnique({
            where: { id, user_id: req.user.id }
        });

        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        const updatedBank = await prisma.bank.update({
            where: { id },
            data: {
                name,
                account_no,
                iban_no,
                currency: currency || bank.currency,
                exchange_rate: exchange_rate != null ? Number(exchange_rate) : bank.exchange_rate,
                starting_balance
            }
        });

        res.json(updatedBank);
    } catch (error) {
        console.error('Error updating bank:', error);
        res.status(500).json({ message: 'Error updating bank' });
    }
};

export const updateBankBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { current_balance } = req.body;

        const bank = await prisma.bank.findUnique({
            where: { id, user_id: req.user.id }
        });

        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        const updatedBank = await prisma.bank.update({
            where: { id },
            // A balance typed in by the user is true as of today.
            data: { current_balance: Number(current_balance), balance_as_of: new Date(), balance_source: 'manual', balance_statement_id: null }
        });

        res.json(updatedBank);
    } catch (error) {
        console.error('Error updating bank balance:', error);
        res.status(500).json({ message: 'Error updating bank balance' });
    }
};

export const deleteBank = async (req, res) => {
    try {
        const { id } = req.params;

        const bank = await prisma.bank.findUnique({
            where: { id, user_id: req.user.id }
        });

        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        await prisma.bank.delete({ where: { id } });

        res.json({ message: 'Bank deleted successfully' });
    } catch (error) {
        console.error('Error deleting bank:', error);
        res.status(500).json({ message: 'Error deleting bank' });
    }
};

/**
 * Upload and parse bank statement
 * POST /api/banks/:bankId/statements/upload
 */
export const uploadStatement = async (req, res) => {
    let filePath = null;

    try {
        const { bankId } = req.params;
        const { password } = req.body;

        logger.log('[STATEMENT] Upload request:', {
            bankId,
            hasFile: !!req.file,
            fileName: req.file?.originalname,
            hasPassword: !!password
        });

        // Validate bank ownership
        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });

        if (!bank) {
            return res.status(404).json({ message: 'Bank not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        filePath = req.file.path;
        logger.log('[STATEMENT] File saved at:', filePath);

        // Declare variables outside try block
        let fileHash = '';
        let rawText = '';
        let pageCount = 1;
        let parsedTxs = [];
        const fileIsCsv = isCsv(req.file);
        // For CSV uploads: balances extracted directly from the metadata section
        let csvOpeningBalance = null;
        let csvClosingBalance = null;

        try {
            // Step 1: Check for duplicate file
            logger.log('[STATEMENT] Checking for duplicate file...');
            fileHash = getFileHash(filePath);
            const isDuplicate = await isFilePreviouslyImported(req.user.id, fileHash, bankId);
            const forceReplace = req.body?.force === 'true' || req.query?.force === 'true';

            if (isDuplicate) {
                const existing = await prisma.bankStatement.findFirst({
                    where: { bank_id: bankId, file_hash: fileHash },
                    select: { id: true, month: true, year: true, transaction_count: true, upload_date: true, file_path: true },
                });

                // Auto-clean empty/failed previous imports; force-replace honours the
                // user's explicit decision after the 409 prompt below.
                const isEmptyFailedImport = existing && (existing.transaction_count ?? 0) === 0;

                if (isEmptyFailedImport || forceReplace) {
                    try {
                        if (existing?.file_path && fs.existsSync(existing.file_path)) {
                            fs.unlinkSync(existing.file_path);
                        }
                        await prisma.bankStatement.delete({ where: { id: existing.id } });
                        logger.log('[STATEMENT] Replaced previous statement:', existing.id, '(reason:', isEmptyFailedImport ? 'empty-failed' : 'force-replace', ')');
                    } catch (cleanupErr) {
                        logger.log('[STATEMENT] Cleanup of previous statement failed:', cleanupErr.message);
                    }
                } else {
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
                // Step 2a: Parse CSV directly
                logger.log('[STATEMENT] Parsing CSV file...');
                try {
                    const csvResult = parseCsvTransactions(filePath);
                    parsedTxs = csvResult.transactions;
                    csvOpeningBalance = csvResult.openingBalance;
                    csvClosingBalance = csvResult.closingBalance;
                    logger.log('[STATEMENT] CSV parsed:', parsedTxs.length, 'transactions, opening:', csvOpeningBalance, 'closing:', csvClosingBalance);
                } catch (csvError) {
                    fs.unlinkSync(filePath);
                    return res.status(400).json({ message: csvError.message });
                }
            } else {
                // Step 2b: Extract PDF text
                logger.log('[STATEMENT] Extracting text from PDF...');
                try {
                    const pdfData = await extractPdfText(filePath, password);
                    rawText = pdfData.rawText;
                    pageCount = pdfData.pageCount;
                    logger.log('[STATEMENT] PDF extracted successfully, text length:', rawText.length);
                    if (rawText.length > 0) {
                        logger.log('[STATEMENT] First 500 chars of extracted text:', rawText.substring(0, 500));
                    }
                } catch (pdfError) {
                    console.error('[STATEMENT] PDF extraction error:', pdfError.message);
                    rawText = '';
                }

                // Step 3: Parse transactions
                logger.log('[STATEMENT] Parsing transactions...');
                try {
                    parsedTxs = rawText ? parseTransactions(rawText) : [];
                    logger.log('[STATEMENT] Parsed transactions count:', parsedTxs.length);
                } catch (parseError) {
                    console.error('[STATEMENT] Transaction parsing error:', parseError.message);
                    parsedTxs = [];
                }
            }
        } catch (preprocessError) {
            console.error('[STATEMENT] Preprocessing error:', preprocessError);
        }

        // Step 4: Create BankStatement record
        logger.log('[STATEMENT] Creating bank statement record...');

        // Extract month and year from first transaction or use current
        let month = new Date().toLocaleString('en-US', { month: 'long' });
        let year = new Date().getFullYear();

        if (parsedTxs.length > 0 && parsedTxs[0].transaction_date) {
            const txDate = new Date(parsedTxs[0].transaction_date);
            month = txDate.toLocaleString('en-US', { month: 'long' });
            year = txDate.getFullYear();
        }

        // Extract balances — priority order:
        //  1. CSV metadata section (Opening Balance / Closing Balance rows above the header)
        //  2. Running balance column in transaction rows (last row = closing)
        //  3. PDF summary-line text parsing
        let openingBalance = csvOpeningBalance;
        let closingBalance = csvClosingBalance;

        if (openingBalance === null || closingBalance === null) {
            const withBalance = parsedTxs.filter(tx => tx.balance != null);
            if (withBalance.length > 0) {
                const sorted = [...withBalance].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
                // Closing = last running balance. Opening stays from CSV metadata (more reliable).
                if (closingBalance === null) closingBalance = sorted[sorted.length - 1].balance;
            }
        }

        // Fall back to summary-line parsing for PDFs (e.g. "Closing Balance: 1,234.56")
        if (closingBalance === null && rawText) {
            const parsed = parseStatementBalances(rawText);
            openingBalance = openingBalance ?? parsed.opening;
            closingBalance = parsed.closing;
        }

        logger.log('[STATEMENT] Balances extracted — opening:', openingBalance, 'closing:', closingBalance);

        // Statement, rows and balance are saved together or not at all.
        const { statement: bankStatement, transactionLogs, duplicateCount, possibleDuplicateCount } = await saveStatementImport({
            kind: 'bank',
            userId: req.user.id,
            accountId: bankId,
            parsedTxs,
            closingBalance,
            statementData: {
                month,
                year,
                file_path: filePath,
                file_hash: fileHash,
                password_encrypted: encryptSecret(password),
                transaction_count: parsedTxs.length,
                processing_status: 'pending',
                opening_balance: openingBalance !== null ? openingBalance : undefined,
                closing_balance: closingBalance !== null ? closingBalance : undefined,
            },
        });

        logger.log(`[STATEMENT] Imported ${transactionLogs.length} transactions (${duplicateCount} duplicates)`);

        // Auto-link transactions to beneficiaries (best effort — the import is already saved)
        await linkTransactionsToBeneficiaries(req.user.id, transactionLogs).catch((e) =>
            console.error('[STATEMENT] Beneficiary linking failed:', e.message));

        res.status(201).json({
            message: 'Statement uploaded and processed',
            statementId: bankStatement.id,
            summary: {
                totalParsed: parsedTxs.length,
                duplicates: duplicateCount,
                possibleDuplicates: possibleDuplicateCount,
                unique: parsedTxs.length - duplicateCount,
                pageCount
            },
            transactions: transactionLogs
        });

    } catch (error) {
        // Cleanup on error
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        console.error('[STATEMENT] Upload failed:', error);
        console.error('[STATEMENT] Error stack:', error.stack);
        console.error('[STATEMENT] Error details:', {
            message: error.message,
            code: error.code,
            meta: error.meta
        });

        res.status(500).json({
            message: 'Failed to process statement',
            error: error.message,
            details: error.meta?.cause || error.code
        });
    }
};

/**
 * Shared finaliser — creates the BankStatement, dedups, categorises, writes
 * transaction logs, links beneficiaries, and syncs the bank balance.
 * Used by the mapping-based commit flow (preview → map → commit).
 *
 * Returns { statement, transactionLogs, duplicateCount, possibleDuplicateCount, balanceUpdated }.
 */
async function finalizeImport({ userId, bankId, parsedTxs, openingBalance, closingBalance, filePath, fileHash, password, reconciled = true, replaceStatementId = null }) {
    // Derive month/year from the earliest transaction
    let month = new Date().toLocaleString('en-US', { month: 'long' });
    let year = new Date().getFullYear();
    if (parsedTxs.length > 0) {
        const sorted = [...parsedTxs].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
        const d = new Date(sorted[0].transaction_date);
        month = d.toLocaleString('en-US', { month: 'long' });
        year = d.getFullYear();
    }

    const saved = await saveStatementImport({
        kind: 'bank',
        userId,
        accountId: bankId,
        parsedTxs,
        closingBalance,
        replaceStatementId,
        statementData: {
            month,
            year,
            file_path: filePath,
            file_hash: fileHash,
            password_encrypted: encryptSecret(password || ''),
            transaction_count: parsedTxs.length,
            // 'unreconciled' = the user imported it despite numbers that don't add up
            processing_status: reconciled ? 'pending' : 'unreconciled',
            opening_balance: openingBalance !== null && openingBalance !== undefined ? openingBalance : undefined,
            closing_balance: closingBalance !== null && closingBalance !== undefined ? closingBalance : undefined,
        },
    });

    await linkTransactionsToBeneficiaries(userId, saved.transactionLogs).catch((e) =>
        console.error('[COMMIT] Beneficiary linking failed:', e.message));

    return saved;
}

/**
 * Step 1 of the mapping flow — inspect an uploaded file and return a preview.
 * CSV → headers, sample rows, auto-detected column mapping, metadata balances.
 * PDF → best-effort parsed transactions + reconciliation for review.
 * The file is kept on disk; `uploadId` is used by the commit step.
 *
 * POST /api/banks/:bankId/statements/preview
 */
export const previewStatement = async (req, res) => {
    let filePath = null;
    try {
        const { bankId } = req.params;
        const { password } = req.body;

        const bank = await prisma.bank.findUnique({ where: { id: bankId, user_id: req.user.id } });
        if (!bank) return res.status(404).json({ message: 'Bank not found' });
        if (!req.file) return res.status(400).json({ message: 'No file provided' });

        filePath = req.file.path;
        const uploadId = await openUploadSession({ userId: req.user.id, kind: 'bank', accountId: bankId, filePath });
        const fileHash = getFileHash(filePath);
        const alreadyImported = await isFilePreviouslyImported(req.user.id, fileHash, bankId);

        if (isCsvName(req.file.originalname) || isCsv(req.file)) {
            const preview = inspectCsv(filePath);
            return res.json({ type: 'csv', uploadId, alreadyImported, ...preview });
        }

        // PDF — parse best-effort and reconcile so the user can review/edit
        let rawText = '';
        try {
            const pdf = await extractPdfText(filePath, password);
            rawText = pdf.rawText || '';
        } catch (e) {
            // Missing/wrong password or not a PDF: the user can fix these, so
            // say so instead of showing an empty review grid.
            if (e.code?.startsWith('PDF_')) throw e;
            logger.log('[PREVIEW] PDF extract failed:', e.message);
        }

        const transactions = rawText ? parseTransactions(rawText) : [];
        const balances = rawText ? parseStatementBalances(rawText) : { opening: null, closing: null };
        const recon = reconcile(transactions, balances.opening, balances.closing);

        return res.json({
            type: 'pdf',
            uploadId,
            alreadyImported,
            transactions,
            opening: balances.opening,
            closing: balances.closing,
            reconciliation: recon,
        });
    } catch (error) {
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        }
        console.error('[PREVIEW] failed:', error);
        return res.status(400).json({
            message: error.message || 'Failed to preview statement',
            ...(error.code?.startsWith('PDF_') ? { code: error.code } : {}),
        });
    }
};

/**
 * Step 2 of the mapping flow — parse with the confirmed mapping (CSV) or the
 * user-reviewed rows (PDF), reconcile, and import.
 *
 * POST /api/banks/:bankId/statements/commit
 * body: { uploadId, type:'csv'|'pdf', mapping?, transactions?, opening?, closing?, password?, force? }
 */
export const commitStatement = async (req, res) => {
    try {
        const { bankId } = req.params;
        const { uploadId, type, mapping, transactions: reviewedTxs, opening, closing, password, force, acceptMismatch } = req.body;

        const bank = await prisma.bank.findUnique({ where: { id: bankId, user_id: req.user.id } });
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        // The upload must be this user's, for this account, unexpired and not yet imported.
        const upload = await resolveUploadSession({ uploadId, userId: req.user.id, kind: 'bank', accountId: bankId });
        if (!upload.filePath) return res.status(upload.status).json({ message: upload.message });
        const filePath = upload.filePath;

        // Duplicate handling (mirror uploadStatement semantics)
        const fileHash = getFileHash(filePath);
        const isDuplicate = await isFilePreviouslyImported(req.user.id, fileHash, bankId);
        // A statement being replaced is only deleted once the new import has
        // passed every check below — a refused import must not lose the old one.
        let replaceExisting = null;
        if (isDuplicate) {
            const existing = await prisma.bankStatement.findFirst({
                where: { bank_id: bankId, file_hash: fileHash },
                select: { id: true, month: true, year: true, transaction_count: true, upload_date: true, file_path: true },
            });
            const isEmptyFailed = existing && (existing.transaction_count ?? 0) === 0;
            if (isEmptyFailed || force === true || force === 'true') {
                replaceExisting = existing;
            } else {
                return res.status(409).json({
                    message: 'This statement was already imported.',
                    duplicate: true,
                    existing: existing ? {
                        id: existing.id, month: existing.month, year: existing.year,
                        transactionCount: existing.transaction_count, uploadedAt: existing.upload_date,
                    } : null,
                });
            }
        }

        // Parse according to type
        let parsedTxs = [];
        let openingBalance = null;
        let closingBalance = null;

        if (type === 'csv') {
            const result = parseCsvWithMapping(filePath, mapping || {});
            parsedTxs = result.transactions;
            openingBalance = result.openingBalance;
            closingBalance = result.closingBalance;
        } else {
            // PDF — trust the user-reviewed rows from the body
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

        // One import per upload, even with a double click or a retry.
        if (!(await claimUploadSession(upload.session.id))) {
            return res.status(409).json({ message: 'This upload was already imported.' });
        }

        let imported;
            try {
                imported = await finalizeImport({
                userId: req.user.id,
                bankId,
                parsedTxs,
                openingBalance,
                closingBalance,
                filePath,
                fileHash,
                password,
                reconciled: reconciliation.ok,
                replaceStatementId: replaceExisting?.id ?? null,
            });
        } catch (e) {
            await releaseUploadSession(upload.session.id);
            throw e;
        }
        const { statement, transactionLogs, duplicateCount, possibleDuplicateCount } = imported;
        // The replaced statement's file is no longer referenced.
        if (replaceExisting?.file_path && replaceExisting.file_path !== filePath && fs.existsSync(replaceExisting.file_path)) {
            try { fs.unlinkSync(replaceExisting.file_path); } catch { /* ignore */ }
        }

        return res.status(201).json({
            message: 'Statement imported',
            statementId: statement.id,
            reconciliation,
            summary: {
                totalParsed: parsedTxs.length,
                duplicates: duplicateCount,
                possibleDuplicates: possibleDuplicateCount,
                unique: parsedTxs.length - duplicateCount,
            },
            transactions: transactionLogs,
        });
    } catch (error) {
        console.error('[COMMIT] failed:', error);
        return res.status(500).json({ message: error.message || 'Failed to import statement' });
    }
};

/**
 * Get transactions from a statement (for review)
 * GET /api/banks/:bankId/statements/:statementId/transactions
 */
export const getStatementTransactions = async (req, res) => {
    try {
        const { bankId, statementId } = req.params;

        // Verify bank ownership
        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });

        if (!bank) {
            return res.status(404).json({ message: 'Bank not found' });
        }

        const transactions = await prisma.bankTransactionLog.findMany({
            where: {
                bank_statement_id: statementId,
                bank_statement: { bank_id: bankId, bank: { user_id: req.user.id } }
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
 * Get ALL transactions for a bank across all statements in one query
 * GET /api/banks/:bankId/transactions
 */
export const getAllTransactions = async (req, res) => {
    try {
        const { bankId } = req.params;

        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });

        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        const transactions = await prisma.bankTransactionLog.findMany({
            where: {
                bank_statement: { bank_id: bankId, bank: { user_id: req.user.id } }
            },
            orderBy: { transaction_date: 'desc' }
        });

        res.json(transactions);
    } catch (error) {
        console.error('Error fetching all transactions:', error);
        res.status(500).json({ message: 'Failed to fetch transactions' });
    }
};

/**
 * Approve a transaction and convert to Expense
 * POST /api/banks/:bankId/statements/:statementId/transactions/:txId/approve
 */
export const approveTransaction = async (req, res) => {
    try {
        const { bankId, txId } = req.params;
        const { approvedCategory, notes } = req.body;

        const result = await approveImportedTransaction({
            kind: 'bank', userId: req.user.id, accountId: bankId, txId, category: approvedCategory, notes,
        });
        if (!result) return res.status(404).json({ message: 'Transaction not found' });

        // Learn from the user's choice (only on the first approval)
        if (result.approved && approvedCategory) {
            await recordUserCategory(req.user.id, result.description, approvedCategory);
        }

        res.json({
            message: result.approved ? 'Transaction approved' : 'Transaction already approved',
            expenseId: result.expenseId,
            isCredit: result.isCredit,
            alreadyApproved: !result.approved,
        });
    } catch (error) {
        console.error('Error approving transaction:', error);
        res.status(500).json({ message: 'Failed to approve transaction' });
    }
};

/**
 * Delete a single transaction log (and its linked expense if any)
 * DELETE /api/banks/:bankId/statements/:statementId/transactions/:txId
 */
export const deleteTransaction = async (req, res) => {
    try {
        const { bankId, txId } = req.params;

        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        const txLog = await prisma.bankTransactionLog.findFirst({
            where: { id: txId, bank_statement: { bank_id: bankId } }
        });
        if (!txLog) return res.status(404).json({ message: 'Transaction not found' });

        if (txLog.created_expense_id) {
            await prisma.expense.deleteMany({ where: { id: txLog.created_expense_id, user_id: req.user.id } });
        }

        await prisma.bankTransactionLog.delete({ where: { id: txId } });

        res.json({ message: 'Transaction deleted' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ message: 'Failed to delete transaction' });
    }
};

/**
 * Update category/notes of an already-approved transaction
 * PUT /api/banks/:bankId/statements/:statementId/transactions/:txId
 */
export const updateTransactionCategory = async (req, res) => {
    try {
        const { bankId, txId } = req.params;
        const { approvedCategory, notes, transaction_type, amount } = req.body;

        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        const txLog = await prisma.bankTransactionLog.findFirst({
            where: { id: txId, bank_statement: { bank_id: bankId } }
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

        await prisma.bankTransactionLog.update({ where: { id: txId }, data: updateData });

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
        console.error('Error updating transaction:', error);
        res.status(500).json({ message: 'Failed to update transaction' });
    }
};

/**
 * Bulk approve transactions in one request
 * POST /api/banks/:bankId/bulk-approve
 * Body: { transactions: [{ txId, approvedCategory }] }
 */
export const bulkApproveTransactions = async (req, res) => {
    try {
        const { bankId } = req.params;
        const { transactions: items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'No transactions provided' });
        }

        let successCount = 0;
        const errors = [];

        // Sequential: each approval is its own small transaction, and a retry
        // of the whole request skips the ones already approved.
        for (const { txId, approvedCategory } of items) {
            try {
                const result = await approveImportedTransaction({
                    kind: 'bank', userId: req.user.id, accountId: bankId, txId, category: approvedCategory,
                });
                if (!result) { errors.push(txId); continue; }
                if (result.approved) {
                    await recordUserCategory(req.user.id, result.description, result.category);
                    successCount++;
                }
            } catch (err) {
                errors.push(txId);
            }
        }

        res.json({ message: `Approved ${successCount} transactions`, successCount, errors });
    } catch (error) {
        console.error('Error bulk approving transactions:', error);
        res.status(500).json({ message: 'Failed to bulk approve transactions' });
    }
};

/**
 * Delete a bank statement and all its transactions
 * DELETE /api/banks/:bankId/statements/:statementId
 */
export const deleteStatement = async (req, res) => {
    try {
        const { bankId, statementId } = req.params;

        // Rows, their expenses, the statement and the balance fallback — one transaction.
        const removed = await removeStatement({ kind: 'bank', userId: req.user.id, accountId: bankId, statementId });
        if (!removed) return res.status(404).json({ message: 'Statement not found' });

        if (removed.filePath && fs.existsSync(removed.filePath)) {
            try { fs.unlinkSync(removed.filePath); } catch (e) { console.warn('Could not delete statement file:', e.message); }
        }

        res.json({ message: 'Statement deleted successfully' });
    } catch (error) {
        console.error('Error deleting statement:', error);
        res.status(500).json({ message: 'Failed to delete statement' });
    }
};

/**
 * Category-wise breakdown of approved transactions
 * GET /api/banks/:bankId/category-summary
 */
export const getCategorySummary = async (req, res) => {
    try {
        const { bankId } = req.params;

        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        const approved = await prisma.bankTransactionLog.findMany({
            where: {
                bank_statement: { bank_id: bankId, bank: { user_id: req.user.id } },
                user_approved: true
            },
            select: { approved_category: true, net_amount: true }
        });

        const map = {};
        for (const tx of approved) {
            const cat = tx.approved_category || 'Other';
            const amount = Number(tx.net_amount);
            if (!map[cat]) map[cat] = { category: cat, total: 0, count: 0, credits: 0, debits: 0 };
            map[cat].count += 1;
            map[cat].total += amount;
            if (amount >= 0) map[cat].credits += amount;
            else map[cat].debits += Math.abs(amount);
        }

        const rows = Object.values(map).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
        res.json({ summary: rows, total_approved: approved.length });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch category summary' });
    }
};

/**
 * Re-parse a stored statement file and sync the closing balance to the bank
 * POST /api/banks/:bankId/statements/:statementId/sync
 */
export const syncStatementBalance = async (req, res) => {
    try {
        const { bankId, statementId } = req.params;

        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        const statement = await prisma.bankStatement.findUnique({
            where: { id: statementId }
        });
        if (!statement || statement.bank_id !== bankId) {
            return res.status(404).json({ message: 'Statement not found' });
        }

        if (!statement.file_path || !fs.existsSync(statement.file_path)) {
            return res.status(400).json({ message: 'Statement file no longer exists on disk' });
        }

        const isCsvFile = statement.file_path.toLowerCase().endsWith('.csv');
        let openingBalance = null;
        let closingBalance = null;

        if (isCsvFile) {
            const parsedTxs = parseCsvTransactions(statement.file_path);
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

        await prisma.bankStatement.update({
            where: { id: statementId },
            data: {
                closing_balance: closingBalance,
                opening_balance: openingBalance !== null ? openingBalance : statement.opening_balance
            }
        });

        // The user explicitly chose this statement's balance; record the date it's true for.
        const last = await prisma.bankTransactionLog.aggregate({
            where: { bank_statement_id: statementId },
            _max: { transaction_date: true },
        });
        await prisma.bank.update({
            where: { id: bankId },
            data: {
                current_balance: closingBalance,
                balance_as_of: last._max.transaction_date ?? new Date(),
                balance_source: 'statement',
                balance_statement_id: statementId,
            }
        });

        res.json({ message: 'Balance synced', closingBalance, openingBalance });
    } catch (error) {
        console.error('Error syncing statement balance:', error);
        res.status(500).json({ message: 'Failed to sync balance', error: error.message });
    }
};

