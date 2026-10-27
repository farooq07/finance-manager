import prisma from '../utils/prisma.js';
import { z } from 'zod';

// Validation Schema
const institutionSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    type: z.enum(['bank', 'wallet', 'cash', 'other']).default('bank'),
    color: z.string().max(20).default('blue')
});

// Default Pakistani banks + wallets. Colours are brand hex values that line up
// with the brand-aware card pickers on the Accounts page. Used both for the
// explicit "Auto-Seed" button and to auto-populate a brand-new user's list so
// the Add Bank / Add Wallet pickers are never empty.
const DEFAULT_INSTITUTIONS = [
    // Banks
    { name: 'HBL', type: 'bank', color: '#1a8556' },
    { name: 'United Bank Limited', type: 'bank', color: '#063a8e' },
    { name: 'MCB Bank', type: 'bank', color: '#003e7e' },
    { name: 'Meezan Bank', type: 'bank', color: '#005c4a' },
    { name: 'Standard Chartered', type: 'bank', color: '#0c77b9' },
    { name: 'Bank Alfalah', type: 'bank', color: '#5c3697' },
    { name: 'Habib Metro', type: 'bank', color: '#0a6f47' },
    { name: 'Askari Bank', type: 'bank', color: '#0b6b3a' },
    { name: 'Faysal Bank', type: 'bank', color: '#0e7c3f' },
    { name: 'Al Baraka Bank', type: 'bank', color: '#1d4ed8' },
    { name: 'Soneri Bank', type: 'bank', color: '#b91c1c' },
    // Wallets
    { name: 'Naya Pay', type: 'wallet', color: '#ff5018' },
    { name: 'Jazz Cash', type: 'wallet', color: '#b8005c' },
    { name: 'Easy Paisa', type: 'wallet', color: '#0a6f47' },
    { name: 'SadaPay', type: 'wallet', color: '#0c0c0c' },
    { name: 'UPaisa', type: 'wallet', color: '#5c3697' },
    // Cash
    { name: 'Cash in Hand', type: 'cash', color: '#6b7280' },
];

// @desc    Get all institutions for a user
// @route   GET /api/institutions
// @access  Private
export const getInstitutions = async (req, res) => {
    try {
        const order = { orderBy: [{ type: 'asc' }, { name: 'asc' }] };
        let institutions = await prisma.institution.findMany({
            where: { user_id: req.user.id },
            ...order
        });

        // First-time users have no list yet — auto-populate the defaults so the
        // Add Bank / Add Wallet pickers always have options without a manual
        // trip to Console Settings.
        if (institutions.length === 0) {
            await prisma.institution.createMany({
                data: DEFAULT_INSTITUTIONS.map((d) => ({ user_id: req.user.id, ...d })),
                skipDuplicates: true
            });
            institutions = await prisma.institution.findMany({
                where: { user_id: req.user.id },
                ...order
            });
        }

        res.json(institutions);
    } catch (error) {
        console.error('Error fetching institutions:', error);
        res.status(500).json({ message: 'Server Error fetching institutions' });
    }
};

// @desc    Create a new institution
// @route   POST /api/institutions
// @access  Private
export const createInstitution = async (req, res) => {
    try {
        const validatedData = institutionSchema.parse(req.body);

        // Check for duplicates
        const existing = await prisma.institution.findUnique({
            where: {
                user_id_name: {
                    user_id: req.user.id,
                    name: validatedData.name
                }
            }
        });

        if (existing) {
            return res.status(400).json({ message: 'Institution with this name already exists' });
        }

        const newInst = await prisma.institution.create({
            data: {
                user_id: req.user.id,
                ...validatedData
            }
        });

        res.status(201).json(newInst);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation Error', errors: error.errors });
        }
        console.error('Error creating institution:', error);
        res.status(500).json({ message: 'Server Error creating institution' });
    }
};

// @desc    Delete an institution
// @route   DELETE /api/institutions/:id
// @access  Private
export const deleteInstitution = async (req, res) => {
    try {
        const { id } = req.params;

        const inst = await prisma.institution.findUnique({ where: { id } });

        if (!inst) {
            return res.status(404).json({ message: 'Institution not found' });
        }

        if (inst.user_id !== req.user.id) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Not authorized' });
        }

        await prisma.institution.delete({ where: { id } });
        res.json({ message: 'Institution removed' });
    } catch (error) {
        console.error('Error deleting institution:', error);
        res.status(500).json({ message: 'Server Error deleting institution' });
    }
};

// @desc    Seed initial defaults (for convenience)
// @route   POST /api/institutions/seed
// @access  Private
export const seedInstitutions = async (req, res) => {
    const defaults = DEFAULT_INSTITUTIONS;

    try {
        let addedCount = 0;
        for (const item of defaults) {
            const exists = await prisma.institution.findUnique({
                where: { user_id_name: { user_id: req.user.id, name: item.name } }
            });
            if (!exists) {
                await prisma.institution.create({
                    data: { user_id: req.user.id, ...item }
                });
                addedCount++;
            }
        }
        res.json({ message: `Seeded ${addedCount} default institutions.` });
    } catch (error) {
        console.error('Error seeding institutions:', error);
        res.status(500).json({ message: 'Server Error seeding institutions' });
    }
};
