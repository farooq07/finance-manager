import prisma from '../utils/prisma.js';

export const getWallets = async (req, res) => {
    try {
        const wallets = await prisma.wallet.findMany({
            where: { user_id: req.user.id },
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
        const { name, institution, balance, color_theme, account_num } = req.body;

        const wallet = await prisma.wallet.create({
            data: {
                user_id: req.user.id,
                name,
                institution,
                balance,
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
