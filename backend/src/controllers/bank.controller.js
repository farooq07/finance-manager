import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
        const { name, account_no, iban_no, starting_balance } = req.body;

        const bank = await prisma.bank.findUnique({
            where: { id, user_id: req.user.id }
        });

        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        const updatedBank = await prisma.bank.update({
            where: { id },
            data: { name, account_no, iban_no, starting_balance }
        });

        res.json(updatedBank);
    } catch (error) {
        console.error('Error updating bank:', error);
        res.status(500).json({ message: 'Error updating bank' });
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
