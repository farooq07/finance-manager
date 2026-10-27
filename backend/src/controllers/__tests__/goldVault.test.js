import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { requireVaultAccess, signVaultToken } from '../../middleware/goldVault.middleware.js';
import { setPin, resetPin, verifyPin } from '../gold.controller.js';
import { getBrokerAccounts, createBrokerAccount, revealBrokerPin } from '../broker.controller.js';
import { decryptSecret, encryptSecret } from '../../utils/crypto.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const nowSec = () => Math.floor(Date.now() / 1000);
const reqFor = (over = {}) => ({ user: { id: 'u1' }, auth: { iat: nowSec() - 3600, tokenVersion: 0 }, headers: {}, body: {}, params: {}, ...over });

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('requireVaultAccess', () => {
    it('a normal login token alone cannot read vault items', async () => {
        jest.spyOn(prisma.goldPin, 'findUnique').mockResolvedValue({ id: 'p1' });
        const r = res(); const next = jest.fn();
        await requireVaultAccess(reqFor(), r, next);
        expect(r.status).toHaveBeenCalledWith(403);
        expect(r.json.mock.calls[0][0].code).toBe('VAULT_LOCKED');
        expect(next).not.toHaveBeenCalled();
    });

    it('a vault token from verify-pin opens it', async () => {
        jest.spyOn(prisma.goldPin, 'findUnique').mockResolvedValue({ id: 'p1' });
        const next = jest.fn();
        await requireVaultAccess(reqFor({ headers: { 'x-vault-token': signVaultToken('u1', 0) } }), res(), next);
        expect(next).toHaveBeenCalled();
    });

    it('another user\'s vault token, a login token, or a token from a revoked session is refused', async () => {
        jest.spyOn(prisma.goldPin, 'findUnique').mockResolvedValue({ id: 'p1' });
        for (const token of [
            signVaultToken('someone-else', 0),
            jwt.sign({ id: 'u1', tv: 0 }, process.env.JWT_SECRET),      // session token, no vault scope
            signVaultToken('u1', 7),                                      // older/newer session
        ]) {
            const r = res(); const next = jest.fn();
            await requireVaultAccess(reqFor({ headers: { 'x-vault-token': token } }), r, next);
            expect(r.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        }
    });

    it('no Gold PIN set → nothing to unlock', async () => {
        jest.spyOn(prisma.goldPin, 'findUnique').mockResolvedValue(null);
        const next = jest.fn();
        await requireVaultAccess(reqFor(), res(), next);
        expect(next).toHaveBeenCalled();
    });
});

describe('vault PIN', () => {
    it('set-pin cannot replace an existing PIN', async () => {
        jest.spyOn(prisma.goldPin, 'findUnique').mockResolvedValue({ id: 'p1' });
        const create = jest.spyOn(prisma.goldPin, 'create');
        const r = res();
        await setPin(reqFor({ body: { pin: '123456' } }), r);
        expect(r.status).toHaveBeenCalledWith(409);
        expect(create).not.toHaveBeenCalled();
    });

    it('reset-pin needs a fresh sign-in', async () => {
        const upsert = jest.spyOn(prisma.goldPin, 'upsert').mockResolvedValue({});
        const stale = res();
        await resetPin(reqFor({ body: { pin: '123456' } }), stale);
        expect(stale.json.mock.calls[0][0].code).toBe('REAUTH_REQUIRED');
        expect(upsert).not.toHaveBeenCalled();

        const fresh = res();
        await resetPin(reqFor({ auth: { iat: nowSec() - 30, tokenVersion: 0 }, body: { pin: '123456' } }), fresh);
        expect(upsert).toHaveBeenCalled();
        expect(fresh.json.mock.calls[0][0].vaultToken).toEqual(expect.any(String));
    });

    it('a correct PIN returns a vault token; a wrong one counts, the 5th locks', async () => {
        jest.spyOn(prisma.goldPin, 'findUnique').mockResolvedValue({ user_id: 'u1', pin_hash: 'h', failed_attempts: 4, locked_until: null });
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);
        const update = jest.spyOn(prisma.goldPin, 'update').mockResolvedValue({});
        const wrong = res();
        await verifyPin(reqFor({ body: { pin: '000000' } }), wrong);
        expect(wrong.json.mock.calls[0][0]).toEqual({ success: false, attemptsLeft: 0 });
        expect(update.mock.calls[0][0].data.locked_until).toBeInstanceOf(Date);

        prisma.goldPin.findUnique.mockResolvedValue({ user_id: 'u1', pin_hash: 'h', failed_attempts: 0, locked_until: new Date(Date.now() + 60000) });
        const locked = res();
        await verifyPin(reqFor({ body: { pin: '123456' } }), locked);
        expect(locked.status).toHaveBeenCalledWith(429);

        prisma.goldPin.findUnique.mockResolvedValue({ user_id: 'u1', pin_hash: 'h', failed_attempts: 0, locked_until: null });
        bcrypt.compare.mockResolvedValueOnce(true);
        const right = res();
        await verifyPin(reqFor({ body: { pin: '123456' } }), right);
        const body = right.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(jwt.verify(body.vaultToken, process.env.JWT_SECRET)).toMatchObject({ id: 'u1', scope: 'gold_vault' });
    });
});

describe('broker PIN', () => {
    it('is stored encrypted and never listed', async () => {
        const create = jest.spyOn(prisma.brokerAccount, 'create').mockImplementation(async ({ data }) => ({ id: 'b1', ...data }));
        const r = res();
        await createBrokerAccount(reqFor({ body: { account_title: 'A', client_code: 'C', stock_pin_code: '4321' } }), r);
        const stored = create.mock.calls[0][0].data.stock_pin_code;
        expect(stored).toMatch(/^v1:/);
        expect(decryptSecret(stored)).toBe('4321');
        expect(r.json.mock.calls[0][0]).toMatchObject({ has_stock_pin: true });
        expect(r.json.mock.calls[0][0].stock_pin_code).toBeUndefined();
    });

    it('legacy plain-text PINs are encrypted on first read', async () => {
        jest.spyOn(prisma.brokerAccount, 'findMany').mockResolvedValue([{ id: 'b1', stock_pin_code: '1111' }, { id: 'b2', stock_pin_code: encryptSecret('2222') }]);
        const update = jest.spyOn(prisma.brokerAccount, 'update').mockResolvedValue({});
        const r = res();
        await getBrokerAccounts(reqFor(), r);
        expect(update).toHaveBeenCalledTimes(1);
        expect(decryptSecret(update.mock.calls[0][0].data.stock_pin_code)).toBe('1111');
        expect(r.json.mock.calls[0][0].every((b) => b.stock_pin_code === undefined)).toBe(true);
    });

    it('reveal needs the app PIN', async () => {
        jest.spyOn(prisma.brokerAccount, 'findFirst').mockResolvedValue({ id: 'b1', stock_pin_code: encryptSecret('4321') });
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ app_pin_code: 'h' });
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false).mockResolvedValueOnce(true);

        const wrong = res();
        await revealBrokerPin(reqFor({ params: { id: 'b1' }, body: { appPin: '0000' } }), wrong);
        expect(wrong.status).toHaveBeenCalledWith(401);

        const right = res();
        await revealBrokerPin(reqFor({ params: { id: 'b1' }, body: { appPin: '1234' } }), right);
        expect(right.json).toHaveBeenCalledWith({ stock_pin_code: '4321' });
        expect(prisma.brokerAccount.findFirst.mock.calls[0][0].where).toEqual({ id: 'b1', user_id: 'u1' });
    });
});
