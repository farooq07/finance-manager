import { interestForPath } from './interests';

export type MenuRow = { visible_to_roles?: string[] };
export type MenuUser = { role?: string; interests?: string[] | null };

/**
 * Whether a menu entry is shown to this user — same rule as the web.
 * 1. Role: the menu_visibility row allows the user's role (no row → allowed).
 * 2. Interests: null/missing shows everything; otherwise a path tied to an
 *    interest needs that interest picked. Core paths always pass.
 */
export function isMenuPathVisible(path: string, row: MenuRow | undefined, user: MenuUser | null | undefined): boolean {
    const roleAllows = !row || (Array.isArray(row.visible_to_roles) && row.visible_to_roles.includes(user?.role ?? ''));
    if (!roleAllows) return false;

    const interests = user?.interests;
    if (!Array.isArray(interests)) return true;
    const interest = interestForPath(path);
    return !interest || interests.includes(interest);
}
