import prisma from '../utils/prisma.js';

// ========== BANK INVESTMENTS ==========

export const getBankInvestments = async (req, res) => {
    try {
        const investments = await prisma.bankInvestment.findMany({
            where: { user_id: req.user.id },
            orderBy: { transaction_date: 'desc' }
        });

        const totalInvested = await prisma.bankInvestment.aggregate({
            where: { user_id: req.user.id },
            _sum: { amount: true }
        });

        res.json({
            investments,
            total_invested: totalInvested._sum.amount || 0
        });
    } catch (error) {
        console.error('Error fetching bank investments:', error);
        res.status(500).json({ message: 'Server error fetching bank investments' });
    }
};

export const addBankInvestment = async (req, res) => {
    try {
        const { transaction_date, amount, description } = req.body;

        const investment = await prisma.bankInvestment.create({
            data: {
                user_id: req.user.id,
                transaction_date: new Date(transaction_date),
                amount,
                description
            }
        });

        res.status(201).json(investment);
    } catch (error) {
        console.error('Error adding bank investment:', error);
        res.status(500).json({ message: 'Server error adding bank investment' });
    }
};

export const deleteBankInvestment = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const investment = await prisma.bankInvestment.findUnique({
            where: { id }
        });

        if (!investment || investment.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Investment record not found' });
        }

        await prisma.bankInvestment.delete({
            where: { id }
        });

        res.json({ message: 'Investment record deleted successfully' });
    } catch (error) {
        console.error('Error deleting bank investment:', error);
        res.status(500).json({ message: 'Server error deleting bank investment' });
    }
};

// ========== PSX SNAPSHOTS ==========

export const getPsxSnapshots = async (req, res) => {
    try {
        const snapshots = await prisma.psxSnapshot.findMany({
            where: { user_id: req.user.id },
            orderBy: { snapshot_date: 'desc' }
        });

        res.json(snapshots);
    } catch (error) {
        console.error('Error fetching PSX snapshots:', error);
        res.status(500).json({ message: 'Server error fetching PSX snapshots' });
    }
};

export const uploadPsxSnapshot = async (req, res) => {
    try {
        const { snapshot_date, total_custody, holdings_data, summary_data } = req.body;
        const parsedDate = new Date(snapshot_date);

        // Calculate total invested AT THIS MOMENT from BankInvestments
        const totalInvestedResult = await prisma.bankInvestment.aggregate({
            where: {
                user_id: req.user.id,
                transaction_date: { lte: parsedDate } // Only sum up to this date
            },
            _sum: { amount: true }
        });

        const total_invested = totalInvestedResult._sum.amount || 0;

        // Upsert snapshot (since we only want 1 per day)
        const snapshot = await prisma.psxSnapshot.upsert({
            where: {
                user_id_snapshot_date: {
                    user_id: req.user.id,
                    snapshot_date: parsedDate
                }
            },
            update: {
                total_custody,
                total_invested,
                holdings_data,
                ...(summary_data ? { summary_data } : {})
            },
            create: {
                user_id: req.user.id,
                snapshot_date: parsedDate,
                total_custody,
                total_invested,
                holdings_data,
                ...(summary_data ? { summary_data } : {})
            }
        });

        res.status(200).json(snapshot);
    } catch (error) {
        console.error('Error uploading PSX snapshot:', error);
        res.status(500).json({ message: 'Server error uploading PSX snapshot' });
    }
};

export const syncPsxData = async (req, res) => {
    try {
        const { snapshot_date, total_custody, holdings_data, summary_data } = req.body;
        const parsedDate = new Date(snapshot_date);

        // Sum up investment up to this date
        const totalInvestedResult = await prisma.bankInvestment.aggregate({
            where: {
                user_id: req.user.id,
                transaction_date: { lte: parsedDate }
            },
            _sum: { amount: true }
        });

        const total_invested = totalInvestedResult._sum.amount || 0;

        const snapshot = await prisma.psxSnapshot.upsert({
            where: {
                user_id_snapshot_date: {
                    user_id: req.user.id,
                    snapshot_date: parsedDate
                }
            },
            update: {
                total_custody,
                total_invested,
                holdings_data,
                ...(summary_data ? { summary_data } : {})
            },
            create: {
                user_id: req.user.id,
                snapshot_date: parsedDate,
                total_custody,
                total_invested,
                holdings_data,
                ...(summary_data ? { summary_data } : {})
            }
        });

        res.status(200).json({
            message: `PSX data for ${snapshot_date} synced successfully`,
            snapshot
        });
    } catch (error) {
        console.error('Error syncing PSX data:', error);
        res.status(500).json({ message: 'Server error syncing PSX data' });
    }
};

export const deletePsxSnapshot = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.psxSnapshot.findUnique({ where: { id } });

        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Snapshot not found' });
        }

        await prisma.psxSnapshot.delete({ where: { id } });
        res.json({ message: 'Snapshot deleted successfully' });
    } catch (error) {
        console.error("Error deleting PSX snapshot:", error);
        res.status(500).json({ message: 'Error deleting snapshot' });
    }
};

export const deleteSymbolFromSnapshot = async (req, res) => {
    try {
        const { id, symbol } = req.params;
        const snapshot = await prisma.psxSnapshot.findUnique({ where: { id } });

        if (!snapshot || snapshot.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Snapshot not found' });
        }

        let holdings = Array.isArray(snapshot.holdings_data) ? snapshot.holdings_data : [];
        const initialCount = holdings.length;
        holdings = holdings.filter(h => h.symbol !== symbol);

        if (holdings.length === initialCount) {
            return res.status(404).json({ message: 'Symbol not found in this snapshot' });
        }

        // Recalculate total_custody
        const newTotalCustody = holdings.reduce((sum, h) => sum + (Number(h.custody_val) || 0), 0);

        await prisma.psxSnapshot.update({
            where: { id },
            data: {
                holdings_data: holdings,
                total_custody: newTotalCustody
            }
        });

        res.json({ message: `Symbol ${symbol} removed from snapshot.` });
    } catch (error) {
        console.error("Error deleting symbol from snapshot:", error);
        res.status(500).json({ message: 'Error updating snapshot' });
    }
};

export const updatePsxSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { summary_data } = req.body;

        const snapshot = await prisma.psxSnapshot.findUnique({
            where: { id }
        });

        if (!snapshot || snapshot.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Snapshot not found' });
        }

        const updatedSnapshot = await prisma.psxSnapshot.update({
            where: { id },
            data: { summary_data }
        });

        res.json(updatedSnapshot);
    } catch (error) {
        console.error('Update PSX Summary Error:', error);
        res.status(500).json({ message: 'Server error updating snapshot summary' });
    }
};
