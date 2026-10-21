import { interestForPath } from './interests';

/**
 * Whether a menu item or page tab is shown to this user.
 *
 * Two rules, both must pass:
 *  1. Role — the menu_visibility row allows the user's role (admin-controlled).
 *     No row for the path → allowed (fail-open, so pages never hide their
 *     own tabs before the table loads).
 *  2. Interests — `user.interests` null shows everything; otherwise a path
 *     tied to an interest needs that interest picked. Core paths always pass.
 *
 * Decluttering only, not access control: hidden pages still open by URL.
 */
export function isMenuPathVisible(path, row, user) {
    const roleAllows = !row || (Array.isArray(row.visible_to_roles) && row.visible_to_roles.includes(user?.role));
    if (!roleAllows) return false;

    const interests = user?.interests;
    if (!Array.isArray(interests)) return true;
    const interest = interestForPath(path);
    return !interest || interests.includes(interest);
}
