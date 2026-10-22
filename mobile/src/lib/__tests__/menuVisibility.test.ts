import { isMenuPathVisible } from '../menuVisibility';
import { INTERESTS, interestForPath } from '../interests';

// Same truth table as frontend/src/utils/__tests__/menuVisibility.test.js.
const everyone = { visible_to_roles: ['user', 'admin', 'super.admin'] };
const adminsOnly = { visible_to_roles: ['admin', 'super.admin'] };
const user = (interests: string[] | null) => ({ role: 'user', interests });

describe('interests table', () => {
    it('has the six web keys, each unlocking one path', () => {
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

    it.each(['/', '/accounts', '/expenses', '/personal', '/personal#zakat', '/reports', '/settings', '/help'])(
        'core path %s stays visible with no interests', (path) => {
            expect(isMenuPathVisible(path, everyone, user([]))).toBe(true);
        });

    it('[] hides interest pages; picks show only their own', () => {
        expect(isMenuPathVisible('/stocks', everyone, user([]))).toBe(false);
        expect(isMenuPathVisible('/personal#gold', everyone, user(['gold']))).toBe(true);
        expect(isMenuPathVisible('/personal#rent', everyone, user(['gold']))).toBe(false);
    });

    it('admin-hidden page stays hidden even when picked', () => {
        expect(isMenuPathVisible('/stocks', adminsOnly, user(['stocks']))).toBe(false);
    });

    it('no menu row → role check passes (fail-open)', () => {
        expect(isMenuPathVisible('/new-thing', undefined, user([]))).toBe(true);
    });

    it('a user object without interests (older response) sees everything', () => {
        expect(isMenuPathVisible('/stocks', everyone, { role: 'user' })).toBe(true);
    });
});
