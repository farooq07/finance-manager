import prisma from '../utils/prisma.js';
import { extractPdfText, getFileHash } from '../services/pdfParser.service.js';
import { parseTransactions, validateBalance } from '../services/transactionParser.service.js';
import { categorizeTransaction, recordUserCategory } from '../services/categorizer.service.js';
import { findWalletDuplicates, isWalletFilePreviouslyImported, markAsDuplicate } from '../services/duplicateDetector.service.js';
import fs from 'fs';

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

        console.log('[WALLET_STATEMENT] Upload request:', {
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
        console.log('[WALLET_STATEMENT] File saved at:', filePath);

        let fileHash = '';
        let rawText = '';
        let pageCount = 1;
        let parsedTxs = [];

        try {
            console.log('[WALLET_STATEMENT] Checking for duplicate file...');
            fileHash = getFileHash(filePath);
            const isDuplicate = await isWalletFilePreviouslyImported(req.user.id, fileHash, walletId);

            if (isDuplicate) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ message: 'This PDF was already imported previously' });
            }

            console.log('[WALLET_STATEMENT] Extracting text from PDF...');
            try {
                const pdfData = await extractPdfText(filePath, password);
                rawText = pdfData.rawText;
                pageCount = pdfData.pageCount;
                console.log('[WALLET_STATEMENT] PDF extracted successfully, text length:', rawText.length);
            } catch (pdfError) {
                console.error('[WALLET_STATEMENT] PDF extraction error:', pdfError.message);
                rawText = '';
            }

            console.log('[WALLET_STATEMENT] Parsing transactions...');
            try {
                parsedTxs = rawText ? parseTransactions(rawText) : [];
                console.log('[WALLET_STATEMENT] Parsed transactions count:', parsedTxs.length);
            } catch (parseError) {
                console.error('[WALLET_STATEMENT] Transaction parsing error:', parseError.message);
                parsedTxs = [];
            }
        } catch (preprocessError) {
            console.error('[WALLET_STATEMENT] Preprocessing error:', preprocessError);
        }

        console.log('[WALLET_STATEMENT] Creating wallet statement record...');

        let month = new Date().toLocaleString('en-US', { month: 'long' });
        let year = new Date().getFullYear();

        if (parsedTxs.length > 0 && parsedTxs[0].transaction_date) {
            const txDate = new Date(parsedTxs[0].transaction_date);
            month = txDate.toLocaleString('en-US', { month: 'long' });
            year = txDate.getFullYear();
        }

        const walletStatement = await prisma.walletStatement.create({
            data: {
                wallet_id: walletId,
                month,
                year,
                file_path: filePath,
                file_hash: fileHash,
                password_encrypted: password ? encryptPassword(password) : null,
                transaction_count: parsedTxs.length,
                processing_status: 'pending'
            }
        });

        console.log('[WALLET_STATEMENT] Checking for duplicates and categorizing...');
        let duplicateMap = new Map();
        let transactionLogs = [];

        if (parsedTxs.length > 0) {
            try {
                duplicateMap = await findWalletDuplicates(req.user.id, walletStatement.id, parsedTxs);
            } catch (dupError) {
                console.error('[WALLET_STATEMENT] Duplicate detection error:', dupError.message);
                duplicateMap = new Map();
            }

            for (let i = 0; i < parsedTxs.length; i++) {
                try {
                    const tx = parsedTxs[i];
                    const isDupTx = duplicateMap.has(i);

                    let categorization = { category: 'Other', confidence: 0 };
                    try {
                        categorization = await categorizeTransaction(
                            req.user.id,
                            tx.description,
                            tx.net_amount
                        );
                    } catch (catError) {
                        console.error('[WALLET_STATEMENT] Categorization error for tx:', tx.description, catError.message);
                    }

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

        console.log(`[WALLET_STATEMENT] Imported ${transactionLogs.length} transactions (${duplicateMap.size} duplicates)`);

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
        const { walletId, statementId, txId } = req.params;
        const { approvedCategory, notes } = req.body;

        const wallet = await prisma.wallet.findUnique({
            where: { id: walletId, user_id: req.user.id }
        });

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        const txLog = await prisma.walletTransactionLog.findUnique({
            where: { id: txId }
        });

        if (!txLog) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (approvedCategory) {
            await recordUserCategory(req.user.id, txLog.description, approvedCategory);
        }

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

        await prisma.walletTransactionLog.update({
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

function encryptPassword(password) {
    return Buffer.from(password).toString('base64');
}
