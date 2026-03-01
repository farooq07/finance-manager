import prisma from '../utils/prisma.js';

// Get user's broker accounts
export const getBrokerAccounts = async (req, res) => {
    try {
        const brokerAccounts = await prisma.brokerAccount.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' }
        });
        res.json(brokerAccounts);
    } catch (error) {
        console.error('Get Broker Accounts API Error:', error);
        res.status(500).json({ message: 'Failed to fetch broker accounts' });
    }
};

// Create new broker account
export const createBrokerAccount = async (req, res) => {
    try {
        const { account_title, client_code, participant_acc_no, cdc_sub_acc_no, stock_pin_code } = req.body;

        if (!account_title || !client_code) {
            return res.status(400).json({ message: 'Account Title and Client Code are required' });
        }

        const brokerAccount = await prisma.brokerAccount.create({
            data: {
                user_id: req.user.id,
                account_title,
                client_code,
                participant_acc_no: participant_acc_no || null,
                cdc_sub_acc_no: cdc_sub_acc_no || null,
                stock_pin_code: stock_pin_code || null
            }
        });

        res.status(201).json(brokerAccount);
    } catch (error) {
        console.error('Create Broker Account API Error:', error);
        res.status(500).json({ message: 'Failed to create broker account' });
    }
};

// Delete broker account
export const deleteBrokerAccount = async (req, res) => {
    try {
        const { id } = req.params;

        const brokerAccount = await prisma.brokerAccount.findUnique({
            where: { id }
        });

        if (!brokerAccount) {
            return res.status(404).json({ message: 'Broker account not found' });
        }

        if (brokerAccount.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this account' });
        }

        await prisma.brokerAccount.delete({
            where: { id }
        });

        res.json({ message: 'Broker account deleted successfully' });
    } catch (error) {
        console.error('Delete Broker Account API Error:', error);
        res.status(500).json({ message: 'Failed to delete broker account' });
    }
};
