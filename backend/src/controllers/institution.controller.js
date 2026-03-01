import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation Schema
const institutionSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    type: z.enum(['bank', 'wallet', 'cash', 'other']).default('bank'),
    color: z.string().max(20).default('blue')
});

// @desc    Get all institutions for a user
// @route   GET /api/institutions
// @access  Private
export const getInstitutions = async (req, res) => {
    try {
        const institutions = await prisma.institution.findMany({
            where: { user_id: req.user.id },
            orderBy: [{ type: 'asc' }, { name: 'asc' }]
        });
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
            return res.status(401).json({ message: 'Not authorized' });
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
    const defaults = [
        { name: 'Standard Chartered', type: 'bank', color: 'emerald' },
        { name: 'Habib Metro', type: 'bank', color: 'purple' },
        { name: 'Easy Paisa', type: 'wallet', color: 'emerald' },
        { name: 'Jazz Cash', type: 'wallet', color: 'rose' },
        { name: 'Naya Pay', type: 'wallet', color: 'amber' },
        { name: 'Cash in Hand', type: 'cash', color: 'slate' },
    ];

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
