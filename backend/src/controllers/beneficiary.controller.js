import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

// ─── Beneficiary CRUD ───────────────────────────────────────────────────────

export const getBeneficiaries = async (req, res) => {
    try {
        const beneficiaries = await prisma.beneficiary.findMany({
            where: { user_id: req.user.id },
            include: {
                accounts: true,
                _count: { select: { transactions: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(beneficiaries);
    } catch (error) {
        console.error('Error fetching beneficiaries:', error);
        res.status(500).json({ message: 'Failed to fetch beneficiaries' });
    }
};

export const getBeneficiaryById = async (req, res) => {
    try {
        const { id } = req.params;
        const beneficiary = await prisma.beneficiary.findUnique({
            where: { id },
            include: {
                accounts: true,
                transactions: {
                    orderBy: { transaction_date: 'desc' },
                    take: 100
                }
            }
        });

        if (!beneficiary || beneficiary.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Beneficiary not found' });
        }

        res.json(beneficiary);
    } catch (error) {
        console.error('Error fetching beneficiary:', error);
        res.status(500).json({ message: 'Failed to fetch beneficiary' });
    }
};

export const createBeneficiary = async (req, res) => {
    try {
        const { name, nickname, phone, notes, accounts } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ message: 'Name is required' });
        }

        // Accounts without a number can't be matched to anything — skip them.
        const validAccounts = Array.isArray(accounts) ? accounts.filter((a) => typeof a?.account_no === 'string' && a.account_no.trim()) : [];

        const beneficiary = await prisma.beneficiary.create({
            data: {
                user_id: req.user.id,
                name: name.trim(),
                nickname: nickname?.trim() || null,
                phone: phone?.trim() || null,
                notes: notes?.trim() || null,
                accounts: validAccounts.length
                    ? { create: validAccounts.map(a => ({
                            account_label: a.account_label?.trim() || null,
                            account_no: a.account_no.trim()
                        })) }
                    : undefined
            },
            include: { accounts: true }
        });

        // Retroactively scan existing transactions for any accounts provided at creation
        if (beneficiary.accounts.length > 0) {
            for (const acc of beneficiary.accounts) {
                await retroactiveScan(req.user.id, acc.account_no, beneficiary.id);
            }
        }

        res.status(201).json(beneficiary);
    } catch (error) {
        console.error('Error creating beneficiary:', error);
        res.status(500).json({ message: 'Failed to create beneficiary' });
    }
};

export const updateBeneficiary = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, nickname, phone, notes } = req.body;

        const existing = await prisma.beneficiary.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Beneficiary not found' });
        }

        const beneficiary = await prisma.beneficiary.update({
            where: { id },
            data: {
                name: name?.trim() ?? existing.name,
                nickname: nickname?.trim() ?? existing.nickname,
                phone: phone?.trim() ?? existing.phone,
                notes: notes?.trim() ?? existing.notes
            },
            include: { accounts: true }
        });

        res.json(beneficiary);
    } catch (error) {
        console.error('Error updating beneficiary:', error);
        res.status(500).json({ message: 'Failed to update beneficiary' });
    }
};

export const deleteBeneficiary = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.beneficiary.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Beneficiary not found' });
        }

        await prisma.beneficiary.delete({ where: { id } });
        res.json({ message: 'Beneficiary deleted' });
    } catch (error) {
        console.error('Error deleting beneficiary:', error);
        res.status(500).json({ message: 'Failed to delete beneficiary' });
    }
};

// ─── Beneficiary Accounts ───────────────────────────────────────────────────

export const addAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { account_label, account_no } = req.body;

        if (!account_no?.trim()) {
            return res.status(400).json({ message: 'account_no is required' });
        }

        const existing = await prisma.beneficiary.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Beneficiary not found' });
        }

        const account = await prisma.beneficiaryAccount.create({
            data: {
                beneficiary_id: id,
                account_label: account_label?.trim() || null,
                account_no: account_no.trim()
            }
        });

        // Retroactively scan all existing bank transactions for this user
        const linked = await retroactiveScan(req.user.id, account_no.trim(), id);

        res.status(201).json({ ...account, retroLinked: linked });
    } catch (error) {
        console.error('Error adding account:', error);
        res.status(500).json({ message: 'Failed to add account' });
    }
};

export const rescanBeneficiary = async (req, res) => {
    try {
        const { id } = req.params;

        const beneficiary = await prisma.beneficiary.findUnique({
            where: { id },
            include: { accounts: true }
        });

        if (!beneficiary || beneficiary.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Beneficiary not found' });
        }

        let total = 0;
        for (const acc of beneficiary.accounts) {
            total += await retroactiveScan(req.user.id, acc.account_no, id);
        }

        res.json({ message: `Linked ${total} transaction(s)`, linked: total });
    } catch (error) {
        console.error('Error rescanning beneficiary:', error);
        res.status(500).json({ message: 'Rescan failed' });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const { id, accountId } = req.params;

        const existing = await prisma.beneficiary.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Beneficiary not found' });
        }

        await prisma.beneficiaryAccount.deleteMany({
            where: { id: accountId, beneficiary_id: id }
        });

        res.json({ message: 'Account removed' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Failed to delete account' });
    }
};

// ─── Retroactive scan ────────────────────────────────────────────────────────

/**
 * Scan ALL existing BankTransactionLog rows for this user and link any whose
 * description contains the given account number to the given beneficiary.
 * Called when a new account number is added to a beneficiary.
 */
async function retroactiveScan(userId, accountNo, beneficiaryId) {
    try {
        const needle = accountNo.toLowerCase().replace(/[\s\-]/g, '');
        if (needle.length < 6) return 0;

        // Load all transaction logs for this user (via bank ownership)
        const txLogs = await prisma.bankTransactionLog.findMany({
            where: {
                bank_statement: {
                    bank: { user_id: userId }
                }
            },
            select: {
                id: true,
                description: true,
                net_amount: true,
                transaction_date: true
            }
        });

        const links = [];
        for (const tx of txLogs) {
            const desc = (tx.description || '').toLowerCase().replace(/\s+/g, '');
            if (desc.includes(needle)) {
                links.push({
                    beneficiary_id: beneficiaryId,
                    bank_transaction_id: tx.id,
                    amount: Math.abs(Number(tx.net_amount)),
                    direction: Number(tx.net_amount) >= 0 ? 'credit' : 'debit',
                    transaction_date: tx.transaction_date,
                    description: tx.description
                });
            }
        }

        if (links.length) {
            await prisma.beneficiaryTransaction.createMany({ data: links, skipDuplicates: true });
            logger.log(`[BENEFICIARY] Retroactive scan: linked ${links.length} existing transactions`);
        }

        return links.length;
    } catch (err) {
        console.error('[BENEFICIARY] Retroactive scan error:', err.message);
        return 0;
    }
}

// ─── Auto-link helper (called from bank/wallet controllers) ─────────────────

/**
 * After parsing bank statement transactions, check if any description contains
 * a known beneficiary account number. If so, create a BeneficiaryTransaction link.
 *
 * @param {string} userId
 * @param {Array}  txLogs  - saved BankTransactionLog records (must have .id, .description, .net_amount, .transaction_date)
 */
export async function linkTransactionsToBeneficiaries(userId, txLogs) {
    if (!txLogs?.length) return;

    try {
        // Load all beneficiary accounts for this user
        const accounts = await prisma.beneficiaryAccount.findMany({
            where: { beneficiary: { user_id: userId } },
            select: { id: true, account_no: true, beneficiary_id: true }
        });

        if (!accounts.length) return;

        const links = [];

        for (const tx of txLogs) {
            const desc = (tx.description || '').toLowerCase().replace(/\s+/g, '');

            for (const acc of accounts) {
                // Normalise account_no: strip spaces, dashes
                const needle = acc.account_no.toLowerCase().replace(/[\s\-]/g, '');
                if (needle.length >= 6 && desc.includes(needle)) {
                    links.push({
                        beneficiary_id: acc.beneficiary_id,
                        bank_transaction_id: tx.id,
                        amount: Math.abs(Number(tx.net_amount)),
                        direction: Number(tx.net_amount) >= 0 ? 'credit' : 'debit',
                        transaction_date: tx.transaction_date,
                        description: tx.description
                    });
                    break; // one match per transaction is enough
                }
            }
        }

        if (links.length) {
            await prisma.beneficiaryTransaction.createMany({ data: links, skipDuplicates: true });
            logger.log(`[BENEFICIARY] Linked ${links.length} transactions to beneficiaries`);
        }
    } catch (err) {
        console.error('[BENEFICIARY] Auto-link error:', err.message);
    }
}
