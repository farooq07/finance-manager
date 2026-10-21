import { describe, it, expect } from 'vitest';
import { isMenuPathVisible } from '../menuVisibility';
import { INTERESTS, interestForPath } from '../interests';

const everyone = { visible_to_roles: ['user', 'admin', 'super.admin'] };
const adminsOnly = { visible_to_roles: ['admin', 'super.admin'] };
const user = (interests) => ({ role: 'user', interests });

describe('interests table', () => {
    it('has the six keys, each unlocking one path', () => {
        expect(INTERESTS.map((i) => i.key)).toEqual(['stocks', 'mutual-funds', 'ledger', 'rent', 'gold', 'assets']);
        expect(interestForPath('/personal#gold')).toBe('gold');
        expect(interestForPath('/accounts')).toBeUndefined();
    });
});

describe('isMenuPathVisible', () => {
    it('role excluded → hidden regardless of interests', () => {
        expect(isMenuPathVisible('/design-system', adminsOnly, user(null))).toBe(false);
    });

    it('interests null → everything the role allows', () => {
        expect(isMenuPathVisible('/stocks', everyone, user(null))).toBe(true);
    });

    it.each(['/', '/accounts', '/expenses', '/personal', '/personal#zakat', '/reports', '/reports#annual', '/settings', '/help'])(
        'core path %s stays visible with no interests', (path) => {
            expect(isMenuPathVisible(path, everyone, user([]))).toBe(true);
        });

    it('[] hides interest pages', () => {
        expect(isMenuPathVisible('/stocks', everyone, user([]))).toBe(false);
        expect(isMenuPathVisible('/personal#rent', everyone, user([]))).toBe(false);
    });

    it('picked interests show only their own pages', () => {
        expect(isMenuPathVisible('/personal#gold', everyone, user(['gold']))).toBe(true);
        expect(isMenuPathVisible('/personal#rent', everyone, user(['gold']))).toBe(false);
    });

    it('admin-hidden page stays hidden even when picked', () => {
        expect(isMenuPathVisible('/stocks', adminsOnly, user(['stocks']))).toBe(false);
    });

    it('unknown path (no menu row) is visible — fail-open, as today', () => {
        expect(isMenuPathVisible('/new-thing', undefined, user([]))).toBe(true);
        expect(isMenuPathVisible('/personal#gold', undefined, user(['gold']))).toBe(true);
    });

    it('a menu row with no role list is hidden (as today)', () => {
        expect(isMenuPathVisible('/accounts', {}, user(null))).toBe(false);
    });
});
