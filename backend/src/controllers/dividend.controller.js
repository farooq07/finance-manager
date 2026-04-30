import prisma from '../utils/prisma.js';

export const getDividends = async (req, res) => {
    try {
        const dividends = await prisma.dividend.findMany({
            where: { user_id: req.user.id },
            orderBy: { payment_date: 'desc' }
        });

        res.json(dividends);
    } catch (error) {
        console.error('Error fetching dividends:', error);
        res.status(500).json({ message: 'Server error fetching dividends' });
    }
};

export const syncDividends = async (req, res) => {
    try {
        const { dividends } = req.body;
        const userId = req.user.id;

        const results = [];

        for (const div of dividends) {
            const {
                event_id,
                security_symbol,
                security_name,
                iban,
                financial_year,
                gross_dividend_amount,
                net_dividend_amount,
                status,
                payment_date,
                reason
            } = div;

            // Upsert based on user_id and event_id
            const result = await prisma.dividend.upsert({
                where: {
                    user_id_event_id: {
                        user_id: userId,
                        event_id: event_id
                    }
                },
                update: {
                    security_symbol,
                    security_name,
                    iban,
                    financial_year,
                    gross_dividend_amount,
                    net_dividend_amount,
                    status,
                    payment_date: payment_date ? new Date(payment_date) : null,
                    reason
                },
                create: {
                    user_id: userId,
                    event_id,
                    security_symbol,
                    security_name,
                    iban,
                    financial_year,
                    gross_dividend_amount,
                    net_dividend_amount,
                    status,
                    payment_date: payment_date ? new Date(payment_date) : null,
                    reason
                }
            });
            results.push(result);
        }

        res.status(200).json({
            message: `Synced ${results.length} dividends successfully`,
            dividends: results
        });
    } catch (error) {
        console.error('Error syncing dividends:', error);
        res.status(500).json({ message: 'Server error syncing dividends' });
    }
};

export const deleteDividend = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.dividend.findUnique({
            where: { id }
        });

        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Dividend record not found' });
        }

        await prisma.dividend.delete({
            where: { id }
        });

        res.json({ message: 'Dividend record deleted successfully' });
    } catch (error) {
        console.error('Error deleting dividend:', error);
        res.status(500).json({ message: 'Server error deleting dividend' });
    }
};
