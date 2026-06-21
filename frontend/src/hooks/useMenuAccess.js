import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Shared access to the menu_visibility table.
 *
 * Returns `canSee(path)` which tells whether the current user's role is allowed
 * to see a given menu item or sub-section (e.g. '/personal#gold').
 *
 * Fail-open: if the data hasn't loaded yet, or there is no row for `path`,
 * we return `true` so pages never accidentally hide their own tabs.
 */
export function useMenuAccess() {
    const { user } = useAuth();

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['menu-visibility'],
        queryFn: () => api.get('/menu-visibility').then((r) => r.data),
        staleTime: 60_000,
        enabled: !!user,
    });

    const canSee = (path) => {
        const row = items.find((i) => i.path === path);
        if (!row) return true; // unknown path → visible by default
        return Array.isArray(row.visible_to_roles) && row.visible_to_roles.includes(user?.role);
    };

    return { items, isLoading, canSee };
}
