import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseCsvWithMapping } from '../csvParser.service.js';

const mapping = { headerRowIndex: 0, date: 0, description: 1, amount: 2, debit: -1, credit: -1, balance: 3, type: -1 };

describe('parseCsvWithMapping — closing balance from rows', () => {
    let dir;
    beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-test-')); });
    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

    const write = (name, rows) => {
        const p = path.join(dir, name);
        fs.writeFileSync(p, ['Date,Description,Amount,Balance', ...rows].join('\n'));
        return p;
    };

    it('oldest-first: closing is the last row\'s balance', () => {
        const file = write('oldest.csv', ['01/03/2026,ATM,-500.00,9500.00', '02/03/2026,SALARY,1000.00,10500.00']);
        expect(parseCsvWithMapping(file, mapping).closingBalance).toBe(10500);
    });

    it('newest-first: closing is the first row\'s balance', () => {
        const file = write('newest.csv', ['02/03/2026,SALARY,1000.00,10500.00', '01/03/2026,ATM,-500.00,9500.00']);
        expect(parseCsvWithMapping(file, mapping).closingBalance).toBe(10500);
    });
});
