import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { fetchDashboardData } from './dashboard.controller.js';
import { NISAB_GRAMS, getLatestPriceRow, summarizeGold } from '../services/goldValuation.service.js';
import { computeZakat } from '../services/zakat.service.js';

// GET /api/zakat/summary — Zakat due on the user's whole wealth (cash,
// investments, gold, dues, debts). Rules live in services/zakat.service.js.
export const getZakatSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const [{ metrics: m }, goldItems, priceRow] = await Promise.all([
            fetchDashboardData(userId),
            prisma.goldItem.findMany({ where: { user_id: userId } }),
            getLatestPriceRow(),
        ]);

        const perGram = priceRow ? Number(priceRow.price_24k_per_gram) : 0;
        const { totalValue: goldValue } = summarizeGold(goldItems, perGram);

        const breakdown = {
            cash: m.totalBankBalance + m.totalWalletBalance + m.totalRentBalance,
            investments: m.totalInvestments,
            goldValue,
            receivables: m.totalReceivable,
            payables: m.totalPayable,
            debts: m.totalDebt,
        };

        res.json({
            breakdown,
            ...computeZakat({ ...breakdown, nisabValue: perGram ? NISAB_GRAMS * perGram : null }),
            goldPriceDate: priceRow?.date ?? null,
        });
    } catch (error) {
        logger.error('[ZAKAT] summary failed:', error);
        res.status(500).json({ message: 'Could not compute zakat summary' });
    }
};

export const getZakatEntries = async (req, res) => {
    try {
        const userId = req.user.id;
        const entries = await prisma.zakat.findMany({
            where: { user_id: userId },
            orderBy: { date: 'desc' }
        });

        const currentYear = new Date().getFullYear();
        let currentYearTotal = 0;

        entries.forEach(entry => {
            if (new Date(entry.date).getFullYear() === currentYear) {
                currentYearTotal += Number(entry.amount);
            }
        });

        res.json({
            entries,
            currentYearTotal
        });
    } catch (error) {
        console.error("Error fetching Zakat entries:", error);
        res.status(500).json({ message: 'Error fetching Zakat data' });
    }
};

export const createZakatEntry = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, description, date } = req.body;

        const entry = await prisma.zakat.create({
            data: {
                user_id: userId,
                amount: Number(amount),
                description,
                date: date ? new Date(date) : new Date()
            }
        });

        res.status(201).json(entry);
    } catch (error) {
        console.error("Error adding Zakat:", error);
        res.status(500).json({ message: 'Error adding Zakat entry' });
    }
};

export const deleteZakatEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.zakat.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Zakat entry not found' });
        }

        await prisma.zakat.delete({ where: { id } });
        res.json({ message: 'Entry deleted successfully' });
    } catch (error) {
        console.error("Error deleting Zakat:", error);
        res.status(500).json({ message: 'Error deleting Zakat entry' });
    }
};
