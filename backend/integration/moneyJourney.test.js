import fs from 'fs';
import path from 'path';
import prisma from '../src/utils/prisma.js';
import * as bank from '../src/controllers/bank.controller.js';
import { getInsights, getAnnualSummary } from '../src/controllers/insights.controller.js';
import { exportTransactions } from '../src/controllers/export.controller.js';
import { fetchDashboardData } from '../src/controllers/dashboard.controller.js';

/**
 * One user's month, end to end, on a real migrated database:
 * import → reconcile → approve (repeatedly, concurrently) → report → export,
 * an overlapping statement, an older statement, and a second user who must
 * see none of it.
 */

const UPLOAD_DIR = 'uploads/statements';
const written = [];

function res() {
    const r = { statusCode: 200, body: undefined, headers: {} };
    r.status = (c) => { r.statusCode = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.send = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    return r;
}

async function importCsv(user, bankId, name, lines, { opening, closing } = {}) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const file = path.join(UPLOAD_DIR, `it-${Date.now()}-${name}.csv`);
    fs.writeFileSync(file, ['Date,Description,Amount,Balance', ...lines].join('\n'));
    written.push(file);

    const preview = res();
    await bank.previewStatement({ user, params: { bankId }, body: {}, file: { path: file, originalname: `${name}.csv`, mimetype: 'text/csv' } }, preview);
    expect(preview.statusCode).toBe(200);

    const commitBody = {
        uploadId: preview.body.uploadId,
        type: 'csv',
        mapping: { headerRowIndex: preview.body.headerRowIndex, ...preview.body.autoMap, opening: String(opening), closing: String(closing) },
    };
    const commit = res();
    await bank.commitStatement({ user, params: { bankId }, body: commitBody }, commit);
    return { commit, commitBody };
}

const insights = async (user, anchor) => {
    const r = res();
    await getInsights({ user, query: { period: 'month', anchor } }, r);
    expect(r.statusCode).toBe(200);
    return r.body.totals;
};

let A, B, bankA;

beforeAll(async () => {
    // Disposable database: start empty.
    await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
    const mk = (email) => prisma.user.create({ data: { email, name: email.split('@')[0], password_hash: 'x', email_verified: true } });
    A = { id: (await mk('ayesha@it.local')).id, role: 'user' };
    B = { id: (await mk('bilal@it.local')).id, role: 'user' };

    const created = res();
    await bank.createBank({ user: A, body: { name: 'Meezan', account_no: '', iban_no: '', starting_balance: 100000 } }, created);
    expect(created.statusCode).toBe(201);
    bankA = created.body.id;
});

afterAll(async () => {
    for (const f of written) fs.rmSync(f, { force: true });
    await prisma.$disconnect();
});

describe('a month of money, end to end', () => {
    let upload;

    test('March statement imports and reconciles; balance and totals follow', async () => {
        upload = await importCsv(A, bankA, 'march', [
            '01/03/2026,IMTIAZ SUPER MARKET,-5000.00,95000.00',
            '05/03/2026,SALARY MARCH,150000.00,245000.00',
            '10/03/2026,KFC DHA,-2500.00,242500.00',
        ], { opening: 100000, closing: 242500 });
        expect(upload.commit.statusCode).toBe(201);
        expect(upload.commit.body.summary).toMatchObject({ totalParsed: 3, duplicates: 0 });

        const b = await prisma.bank.findUnique({ where: { id: bankA } });
        expect(Number(b.current_balance)).toBe(242500);
        expect(b.balance_source).toBe('statement');

        const t = await insights(A, '2026-03-15');
        expect(t.currentSpend).toBe(7500);
        expect(t.currentIncome).toBe(150000);
    });

    test('the same upload cannot be imported twice', async () => {
        const again = res();
        await bank.commitStatement({ user: A, params: { bankId: bankA }, body: upload.commitBody }, again);
        expect(again.statusCode).toBe(409);
        expect(await prisma.bankStatement.count({ where: { bank_id: bankA } })).toBe(1);
    });

    test('approving never changes the total — even repeated and concurrent', async () => {
        const kfc = await prisma.bankTransactionLog.findFirst({ where: { description: 'KFC DHA' } });
        const approve = () => {
            const r = res();
            return bank.approveTransaction({ user: A, params: { bankId: bankA, txId: kfc.id }, body: { approvedCategory: 'Food & Dining' } }, r).then(() => r);
        };

        const first = await approve();
        expect(first.statusCode).toBe(200);
        expect(first.body.alreadyApproved).toBe(false);

        const repeats = await Promise.all([approve(), approve(), approve(), approve()]);
        for (const r of repeats) expect(r.body.alreadyApproved).toBe(true);

        expect(await prisma.expense.count({ where: { user_id: A.id } })).toBe(1);
        const t = await insights(A, '2026-03-15');
        expect(t.currentSpend).toBe(7500);

        const dash = await fetchDashboardData(A.id, { now: new Date('2026-03-20T12:00:00') });
        expect(dash.metrics.currentMonthExpenses).toBe(7500);
    });

    test('another user cannot touch or see it', async () => {
        const kfc = await prisma.bankTransactionLog.findFirst({ where: { description: 'KFC DHA' } });
        const r = res();
        await bank.approveTransaction({ user: B, params: { bankId: bankA, txId: kfc.id }, body: {} }, r);
        expect(r.statusCode).toBe(404);

        expect((await insights(B, '2026-03-15')).currentSpend).toBe(0);

        const exp = res();
        await exportTransactions({ user: B }, exp);
        expect(exp.body.trim().split('\n')).toHaveLength(1); // header only
    });

    test('an overlapping statement: the repeated row is rejected, nothing is doubled', async () => {
        const { commit } = await importCsv(A, bankA, 'march-late', [
            '10/03/2026,KFC DHA,-2500.00,242500.00',
            '15/03/2026,K-ELECTRIC BILL,-8000.00,234500.00',
        ], { opening: 245000, closing: 234500 });
        expect(commit.statusCode).toBe(201);
        expect(commit.body.summary).toMatchObject({ totalParsed: 2, duplicates: 1, possibleDuplicates: 0 });

        const t = await insights(A, '2026-03-15');
        expect(t.currentSpend).toBe(15500);

        const b = await prisma.bank.findUnique({ where: { id: bankA } });
        expect(Number(b.current_balance)).toBe(234500);
    });

    test('an older statement does not overwrite the newer balance; cash is not spending', async () => {
        const { commit } = await importCsv(A, bankA, 'february', [
            '20/02/2026,ATM CASH WITHDRAWAL,-10000.00,100000.00',
        ], { opening: 110000, closing: 100000 });
        expect(commit.statusCode).toBe(201);

        const b = await prisma.bank.findUnique({ where: { id: bankA } });
        expect(Number(b.current_balance)).toBe(234500);

        const feb = await insights(A, '2026-02-15');
        expect(feb.currentSpend).toBe(0);
        expect(feb.cashWithdrawn).toBe(10000);
    });

    test('the annual summary agrees with the monthly figures in one request', async () => {
        const r = res();
        await getAnnualSummary({ user: A, query: { year: '2026' } }, r);
        const feb = r.body.months[1];
        const mar = r.body.months[2];
        expect(mar).toMatchObject({ spending: 15500, income: 150000, hasData: true });
        expect(feb).toMatchObject({ spending: 0, hasData: true });
        expect(r.body.months[0].hasData).toBe(false);
    });

    test('export has every row, duplicates marked', async () => {
        const exp = res();
        await exportTransactions({ user: A }, exp);
        const rows = exp.body.trim().split('\n').slice(1);
        expect(rows).toHaveLength(6);
        expect(rows.filter((r) => r.includes(',rejected,true,'))).toHaveLength(1);
    });
});
