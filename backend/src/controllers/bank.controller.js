import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';
import { extractPdfText, getFileHash } from '../services/pdfParser.service.js';
import { parseTransactions, validateBalance, parseStatementBalances } from '../services/transactionParser.service.js';
import { parseCsvTransactions } from '../services/csvParser.service.js';
import { categorizeTransactionBatch, recordUserCategory } from '../services/categorizer.service.js';
import { findDuplicates, isFilePreviouslyImported, markAsDuplicate } from '../services/duplicateDetector.service.js';
import { linkTransactionsToBeneficiaries } from './beneficiary.controller.js';
import fs from 'fs';

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
            data: { current_balance: Number(current_balance) }
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

        const bankStatement = await prisma.bankStatement.create({
            data: {
                bank_id: bankId,
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

        // Sync bank current_balance with closing balance from statement
        if (closingBalance !== null) {
            await prisma.bank.update({
                where: { id: bankId },
                data: { current_balance: closingBalance }
            });
            logger.log('[STATEMENT] Updated bank current_balance to', closingBalance);
        }

        // Step 5: Check for duplicates and auto-categorize
        logger.log('[STATEMENT] Checking for duplicates and categorizing...');
        let duplicateMap = new Map();
        let transactionLogs = [];

        if (parsedTxs.length > 0) {
            try {
                duplicateMap = await findDuplicates(req.user.id, bankStatement.id, parsedTxs);
            } catch (dupError) {
                console.error('[STATEMENT] Duplicate detection error:', dupError.message);
                duplicateMap = new Map();
            }

            // Step 6: Batch categorise then create transaction logs
            let categorizations = [];
            try {
                categorizations = await categorizeTransactionBatch(req.user.id, parsedTxs);
            } catch (catError) {
                console.error('[STATEMENT] Batch categorization error:', catError.message);
                categorizations = parsedTxs.map(() => ({ category: 'Other', confidence: 0, method: 'default' }));
            }

            for (let i = 0; i < parsedTxs.length; i++) {
                try {
                    const tx = parsedTxs[i];
                    const isDupTx = duplicateMap.has(i);
                    const categorization = categorizations[i] || { category: 'Other', confidence: 0 };

                    const txLog = await prisma.bankTransactionLog.create({
                        data: {
                            bank_statement_id: bankStatement.id,
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
                    console.error('[STATEMENT] Error creating transaction log:', txError.message);
                }
            }
        }

        logger.log(`[STATEMENT] Imported ${transactionLogs.length} transactions (${duplicateMap.size} duplicates)`);

        // Auto-link transactions to beneficiaries
        await linkTransactionsToBeneficiaries(req.user.id, transactionLogs);

        res.status(201).json({
            message: 'Statement uploaded and processed',
            statementId: bankStatement.id,
            summary: {
                totalParsed: parsedTxs.length,
                duplicates: duplicateMap.size,
                unique: parsedTxs.length - duplicateMap.size,
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
        const { bankId, statementId, txId } = req.params;
        const { approvedCategory, notes } = req.body;

        // Verify ownership
        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });

        if (!bank) {
            return res.status(404).json({ message: 'Bank not found' });
        }

        const txLog = await prisma.bankTransactionLog.findFirst({
            where: { id: txId, bank_statement: { bank_id: bankId } }
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
                    payment_method: 'Bank Transfer',
                    notes: notes || txLog.description
                }
            });
            expenseId = expense.id;
        }

        // Update transaction log
        await prisma.bankTransactionLog.update({
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

        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        // Fetch all requested transaction logs, scoped to this bank only
        const txIds = items.map(i => i.txId);
        const txLogs = await prisma.bankTransactionLog.findMany({
            where: { id: { in: txIds }, bank_statement: { bank_id: bankId } }
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
                            amount: Math.abs(txLog.net_amount),
                            category,
                            expense_date: txLog.transaction_date,
                            payment_method: 'Bank Transfer',
                            notes: txLog.description
                        }
                    });
                    expenseId = expense.id;
                }

                await prisma.bankTransactionLog.update({
                    where: { id: txId },
                    data: {
                        user_approved: true,
                        approved_category: category,
                        created_expense_id: expenseId,
                        processing_status: 'approved'
                    }
                });

                await recordUserCategory(req.user.id, txLog.description, category);
                successCount++;
            } catch (err) {
                errors.push(txId);
            }
        }));

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

        const bank = await prisma.bank.findUnique({
            where: { id: bankId, user_id: req.user.id }
        });

        if (!bank) {
            return res.status(404).json({ message: 'Bank not found' });
        }

        const statement = await prisma.bankStatement.findUnique({
            where: { id: statementId },
            include: { parsed_transactions: true }
        });

        if (!statement || statement.bank_id !== bankId) {
            return res.status(404).json({ message: 'Statement not found' });
        }

        // Remove created expenses linked to this statement's approved transactions
        const linkedExpenseIds = statement.parsed_transactions
            .map(t => t.created_expense_id)
            .filter(Boolean);

        if (linkedExpenseIds.length > 0) {
            await prisma.expense.deleteMany({
                where: { id: { in: linkedExpenseIds }, user_id: req.user.id }
            });
        }

        // Delete file from disk
        if (statement.file_path && fs.existsSync(statement.file_path)) {
            try {
                fs.unlinkSync(statement.file_path);
            } catch (e) {
                console.warn('Could not delete statement file:', e.message);
            }
        }

        // Cascade delete will handle transaction logs
        await prisma.bankStatement.delete({ where: { id: statementId } });

        res.json({ message: 'Statement deleted successfully' });
    } catch (error) {
        console.error('Error deleting statement:', error);
        res.status(500).json({ message: 'Failed to delete statement', error: error.message });
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

        await prisma.bank.update({
            where: { id: bankId },
            data: { current_balance: closingBalance }
        });

        res.json({ message: 'Balance synced', closingBalance, openingBalance });
    } catch (error) {
        console.error('Error syncing statement balance:', error);
        res.status(500).json({ message: 'Failed to sync balance', error: error.message });
    }
};

