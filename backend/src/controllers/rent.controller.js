import prisma from '../utils/prisma.js';

// Get all rent entries for the user, ordered by year desc, month
export const getRentEntries = async (req, res) => {
    try {
        const entries = await prisma.rentEntry.findMany({
            where: { user_id: req.user.id },
            orderBy: [{ year: 'desc' }, { payment_date: 'desc' }]
        });

        // Group by year-month for frontend
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        // Calculate totals
        let totalReceived = 0;
        entries.forEach(e => { totalReceived += Number(e.amount); });

        // Group entries by year
        const byYear = {};
        entries.forEach(e => {
            if (!byYear[e.year]) byYear[e.year] = [];
            byYear[e.year].push(e);
        });

        res.json({ entries, totalReceived, byYear });
    } catch (error) {
        console.error("Rent GET Error:", error);
        res.status(500).json({ message: 'Error fetching rent entries' });
    }
};

// Create a new rent entry
export const createRentEntry = async (req, res) => {
    try {
        const { month, year, payer_name, amount, payment_date, account_source, notes } = req.body;

        if (!month || !year || !payer_name || !amount || !payment_date || !account_source) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        const entry = await prisma.rentEntry.create({
            data: {
                user_id: req.user.id,
                month,
                year: parseInt(year),
                payer_name,
                amount: parseFloat(amount),
                payment_date: new Date(payment_date),
                account_source,
                notes: notes || null
            }
        });

        res.status(201).json(entry);
    } catch (error) {
        console.error("Rent CREATE Error:", error);
        res.status(500).json({ message: 'Error creating rent entry' });
    }
};

// Update a rent entry
export const updateRentEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { month, year, payer_name, amount, payment_date, account_source, notes } = req.body;

        const existing = await prisma.rentEntry.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        const updated = await prisma.rentEntry.update({
            where: { id },
            data: {
                ...(month !== undefined && { month }),
                ...(year !== undefined && { year: parseInt(year) }),
                ...(payer_name !== undefined && { payer_name }),
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(payment_date !== undefined && { payment_date: new Date(payment_date) }),
                ...(account_source !== undefined && { account_source }),
                ...(notes !== undefined && { notes })
            }
        });

        res.json(updated);
    } catch (error) {
        console.error("Rent UPDATE Error:", error);
        res.status(500).json({ message: 'Error updating rent entry' });
    }
};

// Delete a rent entry
export const deleteRentEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.rentEntry.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        await prisma.rentEntry.delete({ where: { id } });
        res.json({ message: 'Rent entry deleted' });
    } catch (error) {
        console.error("Rent DELETE Error:", error);
        res.status(500).json({ message: 'Error deleting rent entry' });
    }
};
