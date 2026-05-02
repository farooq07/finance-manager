import prisma from '../utils/prisma.js';

// Get all assets for a user
export const getAssets = async (req, res) => {
    try {
        const assets = await prisma.asset.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' },
        });

        // Calculate total asset value
        const totalValue = assets.reduce((sum, item) => sum + Number(item.value || 0), 0);

        res.json({
            assets,
            totalValue
        });
    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({ message: 'Server error while fetching assets.' });
    }
};

// Add a new asset
export const createAsset = async (req, res) => {
    try {
        const { name, type, value, purchase_date, description } = req.body;

        if (!name || !type) {
            return res.status(400).json({ message: 'Name and type are required' });
        }

        const newAsset = await prisma.asset.create({
            data: {
                user_id: req.user.id,
                name,
                type,
                value: value || 0,
                purchase_date: purchase_date ? new Date(purchase_date) : null,
                description: description || ''
            }
        });

        res.status(201).json(newAsset);
    } catch (error) {
        console.error('Error creating asset:', error);
        res.status(500).json({ message: 'Server error while creating asset.' });
    }
};

// Delete an asset
export const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify the asset belongs to the user
        const asset = await prisma.asset.findUnique({
            where: { id }
        });

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        if (asset.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this asset' });
        }

        await prisma.asset.delete({
            where: { id }
        });

        res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
        console.error('Error deleting asset:', error);
        res.status(500).json({ message: 'Server error while deleting asset.' });
    }
};
