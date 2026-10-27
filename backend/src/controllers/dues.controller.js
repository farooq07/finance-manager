import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import csv from 'csv-parser';
import { sendOtpEmail } from '../utils/email.js';

// Get all people associated with user and their net balances
export const getPeopleWithLedgers = async (req, res) => {
    try {
        logger.log("📌 GET /dues - User ID:", req.user?.id, "Email:", req.user?.email);

        const people = await prisma.person.findMany({
            where: { user_id: req.user.id },
            include: { transactions: true }
        });

        logger.log(`📊 Found ${people.length} people for user ${req.user.id}`);

        // Calculate net balance for each person
        const peopleWithNet = people.map(p => {
            let netBalance = 0;
            p.transactions.forEach(t => {
                if (t.transaction_type === 'receivable') {
                    netBalance += Number(t.amount);
                } else if (t.transaction_type === 'payable') {
                    netBalance -= Number(t.amount);
                }
            });
            return { ...p, netBalance };
        });

        logger.log(`✅ Returning ${peopleWithNet.length} people with transactions`);
        res.json(peopleWithNet);
    } catch (error) {
        console.error("❌ Dues Ledger GET Error:", error);
        res.status(500).json({ message: 'Error fetching ledgers' });
    }
};

export const createPerson = async (req, res) => {
    try {
        const { name, email } = req.body;

        // Check if name already exists
        let person = await prisma.person.findFirst({
            where: { user_id: req.user.id, name }
        });

        if (person) {
            return res.status(400).json({ message: 'Person already exists' });
        }

        person = await prisma.person.create({
            data: {
                user_id: req.user.id,
                name,
                email: email || null
            }
        });

        res.status(201).json(person);
    } catch (error) {
        res.status(500).json({ message: 'Error adding person' });
    }
};

export const getPerson = async (req, res) => {
    try {
        const { id } = req.params;
        const person = await prisma.person.findUnique({
            where: { id },
            include: { 
                transactions: {
                    orderBy: { transaction_date: 'desc' }
                } 
            }
        });

        if (!person || person.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Person not found' });
        }

        let netBalance = 0;
        person.transactions.forEach(t => {
            if (t.transaction_type === 'receivable') {
                netBalance += Number(t.amount);
            } else if (t.transaction_type === 'payable') {
                netBalance -= Number(t.amount);
            }
        });

        res.json({ ...person, netBalance });
    } catch (error) {
        console.error("Dues Person GET Error:", error);
        res.status(500).json({ message: 'Error fetching person' });
    }
};

export const updatePerson = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;
        logger.log("Updating person ID:", id);

        const existing = await prisma.person.findUnique({ where: { id } });
        logger.log("Existing person:", existing);
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Person not found' });
        }

        const person = await prisma.person.update({
            where: { id },
            data: {
                name,
                email: email || null
            }
        });

        res.json(person);
    } catch (error) {
        res.status(500).json({ message: 'Error updating person' });
    }
};

// Send Reminder Email (if net balance > 0)
export const sendReminderEmailHandler = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify person and access
        const person = await prisma.person.findUnique({
            where: { id },
            include: { transactions: true }
        });

        if (!person || person.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Person not found' });
        }

        if (!person.email) {
            return res.status(400).json({ message: 'Person does not have an email address associated' });
        }

        // Compute net balance 
        let netBalance = 0;
        person.transactions.forEach(t => {
            if (t.transaction_type === 'receivable') {
                netBalance += Number(t.amount);
            } else if (t.transaction_type === 'payable') {
                netBalance -= Number(t.amount);
            }
        });

        if (netBalance <= 0) {
            return res.status(400).json({ message: 'Only active outstanding positive balances can be reminded.' });
        }

        // Dynamically import specific email function specifically built for reminders to avoid bleeding dependencies
        const { sendReminderEmail } = await import('../utils/email.js');
        await sendReminderEmail(person.email, person.name, netBalance);

        res.json({ message: `Reminder email successfully dispatched to ${person.email}` });
    } catch (error) {
        console.error("Error sending reminder email:", error);
        res.status(500).json({ message: 'Error sending reminder email' });
    }
};

// Log a due transaction (borrowed / lent)
export const createDuesTransaction = async (req, res) => {
    try {
        const { id } = req.params; // person id
        const { transaction_type, amount, transaction_date, description } = req.body;

        const existing = await prisma.person.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Person not found' });
        }

        const transaction = await prisma.duesTransaction.create({
            data: {
                user_id: req.user.id,
                person_id: id,
                transaction_type, // 'receivable' or 'payable'
                amount,
                transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
                description
            }
        });

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Error creating ledger transaction' });
    }
};

export const deletePerson = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.person.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Person not found' });
        }

        await prisma.person.delete({ where: { id } });
        res.json({ message: 'Person and all associated ledgers deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting person' });
    }
};

// Upload CSV with Detail and Dues columns for a specific person
export const uploadDuesCSV = async (req, res) => {
    try {
        const { id } = req.params; // person id

        if (!req.file) {
            return res.status(400).json({ message: 'No CSV file uploaded' });
        }

        const existing = await prisma.person.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Person not found' });
        }

        const rows = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', async () => {
                let created = 0;

                for (const row of rows) {
                    // Support column headers: Detail/detail, Dues/dues, Price/price
                    const detail = row.Detail || row.detail || row.DETAIL || '';
                    const duesRaw = row.Dues || row.dues || row.DUES || row.Price || row.price || row.PRICE || '0';
                    const amount = parseFloat(duesRaw);

                    if (isNaN(amount) || amount === 0) continue;

                    const transaction_type = amount > 0 ? 'receivable' : 'payable';
                    // Optional Date column; rows without a readable date are dated today.
                    const dateRaw = String(row.Date || row.date || row.DATE || '').trim();
                    const parsedDate = dateRaw ? new Date(dateRaw) : null;
                    const transaction_date = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date();

                    await prisma.duesTransaction.create({
                        data: {
                            user_id: req.user.id,
                            person_id: id,
                            transaction_type,
                            amount: Math.abs(amount),
                            transaction_date,
                            description: detail.trim()
                        }
                    });
                    created++;
                }

                // Clean up uploaded file
                fs.unlinkSync(req.file.path);

                res.status(200).json({
                    message: `Successfully imported ${created} entries`,
                    imported: created
                });
            });

    } catch (error) {
        console.error("Dues CSV Upload Error:", error);
        res.status(500).json({ message: 'Error processing CSV' });
    }
};

// Delete individual transactions by IDs
export const deleteTransactions = async (req, res) => {
    try {
        const { ids } = req.body; // array of transaction IDs

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No transaction IDs provided' });
        }

        // Only delete transactions belonging to this user
        const result = await prisma.duesTransaction.deleteMany({
            where: {
                id: { in: ids },
                user_id: req.user.id
            }
        });

        res.json({ message: `Deleted ${result.count} entries`, deleted: result.count });
    } catch (error) {
        console.error("Delete transactions error:", error);
        res.status(500).json({ message: 'Error deleting transactions' });
    }
};

// Update a single transaction
export const updateTransaction = async (req, res) => {
    try {
        const { txId } = req.params;
        const { description, amount, transaction_date, transaction_type } = req.body;

        if (transaction_type !== undefined && !['receivable', 'payable'].includes(transaction_type)) {
            return res.status(400).json({ message: "transaction_type must be 'receivable' or 'payable'" });
        }
        if (amount !== undefined && !(Math.abs(Number(amount)) > 0)) {
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        const existing = await prisma.duesTransaction.findUnique({ where: { id: txId } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const updated = await prisma.duesTransaction.update({
            where: { id: txId },
            data: {
                ...(description !== undefined && { description }),
                ...(amount !== undefined && { amount: Math.abs(Number(amount)) }),
                ...(transaction_date !== undefined && { transaction_date: transaction_date ? new Date(transaction_date) : new Date() }),
                ...(transaction_type !== undefined && { transaction_type })
            }
        });

        res.json(updated);
    } catch (error) {
        console.error("Update transaction error:", error);
        res.status(500).json({ message: 'Error updating transaction' });
    }
};

// Bulk update transaction type for selected IDs
export const bulkUpdateType = async (req, res) => {
    try {
        const { ids, transaction_type } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No transaction IDs provided' });
        }
        if (!['receivable', 'payable'].includes(transaction_type)) {
            return res.status(400).json({ message: 'Invalid transaction type' });
        }

        const result = await prisma.duesTransaction.updateMany({
            where: {
                id: { in: ids },
                user_id: req.user.id
            },
            data: { transaction_type }
        });

        res.json({ message: `Updated ${result.count} entries to ${transaction_type}`, updated: result.count });
    } catch (error) {
        console.error("Bulk update type error:", error);
        res.status(500).json({ message: 'Error updating transactions' });
    }
};
