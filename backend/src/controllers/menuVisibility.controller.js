import prisma from '../utils/prisma.js';

/**
 * GET /api/menu-visibility
 * Returns the menu items + which roles can see each.
 * Any authenticated user can read; the Sidebar uses this to filter.
 */
export const getMenuVisibility = async (req, res) => {
    try {
        const items = await prisma.$queryRaw`
            SELECT path, name, icon, visible_to_roles, sort_order, parent_path
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
 * Body: { items: [{ path, visible_to_roles: [string] }] }
 * Super-admin only — bulk update which roles can see each menu item.
 */
export const updateMenuVisibility = async (req, res) => {
    try {
        if (req.user.role !== 'super.admin') {
            return res.status(403).json({ message: 'Only super-admins can update menu access' });
        }

        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'items array is required' });
        }

        for (const item of items) {
            if (typeof item.path !== 'string' || !Array.isArray(item.visible_to_roles)) continue;
            // Sanitise — only allow known role strings
            const cleanRoles = item.visible_to_roles
                .filter(r => typeof r === 'string')
                .map(r => r.trim())
                .filter(Boolean);
            await prisma.$executeRaw`
                UPDATE menu_visibility
                SET visible_to_roles = ${cleanRoles}::text[], updated_at = NOW()
                WHERE path = ${item.path}
            `;
        }

        const updated = await prisma.$queryRaw`
            SELECT path, name, icon, visible_to_roles, sort_order, parent_path
            FROM menu_visibility
            ORDER BY sort_order ASC
        `;
        res.json(updated);
    } catch (error) {
        console.error('Update menu visibility error:', error);
        res.status(500).json({ message: 'Failed to update menu access' });
    }
};
