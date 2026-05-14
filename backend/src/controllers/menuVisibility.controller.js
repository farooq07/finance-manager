import prisma from '../utils/prisma.js';

/**
 * GET /api/menu-visibility
 * Returns the full list of menu items with their visibility flag.
 * Any authenticated user can call this — the Sidebar uses it to filter
 * what's displayed. Admins/super.admins always see everything regardless
 * of the visible_to_user flag (enforced by the frontend Sidebar).
 */
export const getMenuVisibility = async (req, res) => {
    try {
        const items = await prisma.$queryRaw`
            SELECT path, name, icon, visible_to_user, sort_order
            FROM menu_visibility
            ORDER BY sort_order ASC
        `;
        res.json(items);
    } catch (error) {
        console.error('Get menu visibility error:', error);
        res.status(500).json({ message: 'Failed to load menu visibility' });
    }
};

/**
 * PUT /api/menu-visibility
 * Body: { items: [{ path, visible_to_user }] }
 * Super-admin only — bulk update which menu items are visible to regular users.
 */
export const updateMenuVisibility = async (req, res) => {
    try {
        if (req.user.role !== 'super.admin') {
            return res.status(403).json({ message: 'Only super-admins can update menu visibility' });
        }

        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'items array is required' });
        }

        for (const item of items) {
            if (typeof item.path !== 'string' || typeof item.visible_to_user !== 'boolean') continue;
            await prisma.$executeRaw`
                UPDATE menu_visibility
                SET visible_to_user = ${item.visible_to_user}, updated_at = NOW()
                WHERE path = ${item.path}
            `;
        }

        const updated = await prisma.$queryRaw`
            SELECT path, name, icon, visible_to_user, sort_order
            FROM menu_visibility
            ORDER BY sort_order ASC
        `;
        res.json(updated);
    } catch (error) {
        console.error('Update menu visibility error:', error);
        res.status(500).json({ message: 'Failed to update menu visibility' });
    }
};
