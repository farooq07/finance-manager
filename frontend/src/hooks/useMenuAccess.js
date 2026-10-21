import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isMenuPathVisible } from '../utils/menuVisibility';

/**
 * Shared access to the menu_visibility table.
 *
 * Returns `canSee(path)` which tells whether the current user should see a
 * given menu item or sub-section (e.g. '/personal#gold') — their role allows
 * it and, if they picked interests, it's core or one of their picks.
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

    const canSee = (path) => isMenuPathVisible(path, items.find((i) => i.path === path), user);

    return { items, isLoading, canSee };
}
