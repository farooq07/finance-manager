import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { runJob, slotKey, jobHealth } from '../jobRunner.service.js';
import { redact } from '../../utils/logger.js';

const at = new Date('2026-10-27T03:00:20Z');

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('runJob', () => {
    it('the instance that claims the slot runs the job and records ok', async () => {
        jest.spyOn(prisma.jobRun, 'create').mockResolvedValue({ id: 'r1' });
        const update = jest.spyOn(prisma.jobRun, 'update').mockResolvedValue({});
        const fn = jest.fn(async () => {});
        expect(await runJob('fx-rates', fn, { at })).toBe('ran');
        expect(prisma.jobRun.create).toHaveBeenCalledWith({ data: { job: 'fx-rates', run_key: '2026-10-27T03:00' } });
        expect(fn).toHaveBeenCalled();
        expect(update.mock.calls[0][0].data.status).toBe('ok');
    });

    it('another replica firing in the same minute skips', async () => {
        jest.spyOn(prisma.jobRun, 'create').mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
        const fn = jest.fn();
        expect(await runJob('fx-rates', fn, { at })).toBe('skipped');
        expect(fn).not.toHaveBeenCalled();
    });

    it('a failure is recorded with its error', async () => {
        jest.spyOn(prisma.jobRun, 'create').mockResolvedValue({ id: 'r1' });
        const update = jest.spyOn(prisma.jobRun, 'update').mockResolvedValue({});
        expect(await runJob('gold-price', async () => { throw new Error('site down'); }, { at })).toBe('failed');
        expect(update.mock.calls[0][0].data).toMatchObject({ status: 'failed', error: 'site down' });
    });

    it('slot keys are the same on every replica within a minute', () => {
        expect(slotKey(new Date('2026-10-27T03:00:01Z'))).toBe(slotKey(new Date('2026-10-27T03:00:59Z')));
    });
});

describe('jobHealth', () => {
    it('reports failed and stuck runs', async () => {
        const now = new Date('2026-10-27T12:00:00Z');
        jest.spyOn(prisma.jobRun, 'findMany').mockResolvedValue([
            { job: 'gold-price', run_key: 'a', status: 'failed', error: 'x', started_at: new Date('2026-10-27T05:00:00Z') },
            { job: 'fx-rates', run_key: 'b', status: 'running', started_at: new Date('2026-10-26T01:00:00Z') },
            { job: 'bill-reminders', run_key: 'c', status: 'ok', started_at: new Date('2026-10-27T03:00:00Z') },
        ]);
        const h = await jobHealth(now);
        expect(h.ok).toBe(false);
        expect(h.problems.map((p) => p.job)).toEqual(['gold-price', 'fx-rates']);
        expect(h.latest).toHaveLength(3);
    });
});

describe('redact', () => {
    it('masks tokens, passwords, codes and database URLs', () => {
        const out = redact('Authorization: Bearer abc.def.ghi {"password":"hunter2","otp":"123456"} postgresql://u:p@host/db');
        expect(out).not.toMatch(/hunter2|123456|abc\.def|u:p@host/);
        expect(out).toContain('[redacted]');
    });
});
