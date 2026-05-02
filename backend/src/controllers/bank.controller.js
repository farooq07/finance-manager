import prisma from '../utils/prisma.js';
import { extractPdfText, getFileHash } from '../services/pdfParser.service.js';
import { parseTransactions, validateBalance } from '../services/transactionParser.service.js';
import { categorizeTransaction, recordUserCategory } from '../services/categorizer.service.js';
import { findDuplicates, isFilePreviouslyImported, markAsDuplicate } from '../services/duplicateDetector.service.js';
import fs from 'fs';

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

        // Step 1: Check for duplicate file
        const fileHash = getFileHash(filePath);
        const isDuplicate = await isFilePreviouslyImported(req.user.id, fileHash, bankId);

        if (isDuplicate) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'This PDF was already imported previously' });
        }

        // Step 2: Extract PDF text
        console.log('[STATEMENT] Extracting text from PDF...');
        const { rawText, pageCount } = await extractPdfText(filePath, password);

        if (!rawText || rawText.length < 100) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Could not extract text from PDF. Try a different format or file.' });
        }

        // Step 3: Parse transactions
        console.log('[STATEMENT] Parsing transactions...');
        const parsedTxs = parseTransactions(rawText);

        if (parsedTxs.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'No transactions found in the statement.' });
        }

        // Step 4: Create BankStatement record
        console.log('[STATEMENT] Creating bank statement record...');
        const bankStatement = await prisma.bankStatement.create({
            data: {
                bank_id: bankId,
                file_path: filePath,
                file_hash: fileHash,
                password_encrypted: password ? encryptPassword(password) : null,
                transaction_count: parsedTxs.length,
                processing_status: 'pending'
            }
        });

        // Step 5: Check for duplicates and auto-categorize
        console.log('[STATEMENT] Checking for duplicates and categorizing...');
        const duplicateMap = await findDuplicates(req.user.id, bankStatement.id, parsedTxs);

        // Step 6: Create transaction logs with auto-categorization
        const transactionLogs = [];

        for (let i = 0; i < parsedTxs.length; i++) {
            const tx = parsedTxs[i];
            const isDupTx = duplicateMap.has(i);

            // Auto-categorize
            const categorization = await categorizeTransaction(
                req.user.id,
                tx.description,
                tx.net_amount
            );

            const txLog = await prisma.bankTransactionLog.create({
                data: {
                    bank_statement_id: bankStatement.id,
                    transaction_date: tx.transaction_date,
                    description: tx.description,
                    debit_amount: tx.debit_amount,
                    credit_amount: tx.credit_amount,
                    net_amount: tx.net_amount,
                    suggested_category: categorization.category,
                    category_confidence: categorization.confidence,
                    is_duplicate: isDupTx,
                    duplicate_of_id: isDupTx ? duplicateMap.get(i).duplicateOfId : null,
                    processing_status: isDupTx ? 'rejected' : 'pending'
                }
            });

            transactionLogs.push(txLog);
        }

        console.log(`[STATEMENT] Imported ${parsedTxs.length - duplicateMap.size} transactions (${duplicateMap.size} duplicates)`);

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

        console.error('[STATEMENT] Upload failed:', error.message);
        res.status(500).json({
            message: 'Failed to process statement',
            error: error.message
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
                bank_statement: { bank_id: bankId }
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

        const txLog = await prisma.bankTransactionLog.findUnique({
            where: { id: txId }
        });

        if (!txLog) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Learn from user's choice
        if (approvedCategory) {
            await recordUserCategory(req.user.id, txLog.description, approvedCategory);
        }

        // Create Expense record
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

        // Update transaction log
        await prisma.bankTransactionLog.update({
            where: { id: txId },
            data: {
                user_approved: true,
                approved_category: approvedCategory,
                created_expense_id: expense.id,
                processing_status: 'approved',
                notes
            }
        });

        res.json({ message: 'Transaction approved', expenseId: expense.id });
    } catch (error) {
        console.error('Error approving transaction:', error);
        res.status(500).json({ message: 'Failed to approve transaction' });
    }
};

/**
 * Helper: Encrypt password (simple encoding for now)
 * TODO: Use proper encryption
 */
function encryptPassword(password) {
    return Buffer.from(password).toString('base64');
}
