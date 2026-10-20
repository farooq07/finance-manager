import { parseTransactions, validateBalance } from '../transactionParser.service.js';

// ─── parseTransactions ────────────────────────────────────────────────────────

describe('parseTransactions — Habib Metro format (DD-Mmm-YYYY)', () => {
    it('parses a single debit transaction', () => {
        const text = `02-Mar-2026 IBFT RAAST MOBILE TRANSFER 5,000.00 95,000.00`;
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(1);
        expect(txs[0].net_amount).toBe(-5000);
        expect(txs[0].debit_amount).toBe(5000);
        expect(txs[0].credit_amount).toBeNull();
        expect(txs[0].transaction_date).toEqual(new Date(Date.UTC(2026, 2, 2)));
    });

    it('parses a single credit transaction', () => {
        const text = `15-Apr-2026 SALARY CREDIT MONTHLY 50,000.00 145,000.00`;
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(1);
        expect(txs[0].net_amount).toBe(50000);
        expect(txs[0].credit_amount).toBe(50000);
        expect(txs[0].debit_amount).toBeNull();
    });

    it('parses multiple transactions', () => {
        const text = [
            '01-Mar-2026 IBFT PAYMENT TO VENDOR 10,000.00 90,000.00',
            '05-Mar-2026 SALARY CREDIT 80,000.00 170,000.00',
        ].join('\n');

        const txs = parseTransactions(text);
        expect(txs).toHaveLength(2);
        expect(txs[0].net_amount).toBe(-10000);
        expect(txs[1].net_amount).toBe(80000);
    });

    it('filters out footer lines (opening balance)', () => {
        const text = [
            'Opening Balance 100,000.00',
            '02-Mar-2026 ATM WITHDRAWAL 5,000.00 95,000.00',
        ].join('\n');

        const txs = parseTransactions(text);
        expect(txs).toHaveLength(1);
    });

    it('filters out closing balance lines', () => {
        const text = [
            '10-Mar-2026 SALARY 50,000.00 150,000.00',
            'Closing Balance 150,000.00',
        ].join('\n');

        const txs = parseTransactions(text);
        expect(txs).toHaveLength(1);
    });

    it('returns empty array when no date markers found', () => {
        const text = 'No dates here, just some random text and 1,234.56 amounts';
        const txs = parseTransactions(text);
        expect(txs).toHaveLength(0);
    });

    it('skips zero-amount rows', () => {
        const text = `03-Mar-2026 SERVICE CHARGES RS 0.00`;
        const txs = parseTransactions(text);
        expect(txs).toHaveLength(0);
    });
});

describe('parseTransactions — Standard Chartered format (DDMmmYY)', () => {
    it('parses SCB date format correctly', () => {
        const text = `01Apr26 IBFT ONLINE TRANSFER 5,340.00 710,762.25`;
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(1);
        expect(txs[0].transaction_date).toEqual(new Date(Date.UTC(2026, 3, 1)));
    });

    it('filters out SCB BALANCE B/F lines', () => {
        const text = [
            '01Apr26 BALANCE B/F 710,762.25',
            '02Apr26 DC TXN PURCHASE 5,000.00 705,762.25',
        ].join('\n');

        const txs = parseTransactions(text);
        expect(txs).toHaveLength(1);
        expect(txs[0].net_amount).toBe(-5000);
    });

    it('filters date-prefixed BALANCE B/F lines', () => {
        const text = [
            '01Apr26 DC TXN PURCHASE 1,000.00 9,000.00',
            '01May26 BALANCE B/F 9,000.00',
            '02May26 DC TXN PURCHASE 500.00 8,500.00',
        ].join('\n');

        const txs = parseTransactions(text);
        expect(txs).toHaveLength(2);
    });

    it('classifies dc txn as debit', () => {
        const text = `15Apr26 DC TXN HARDEES LAHORE 850.00 99,150.00`;
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(1);
        expect(txs[0].net_amount).toBe(-850);
    });

    it('ignores noise numbers on wrapped description lines (fee %, reference codes)', () => {
        // The real withdrawal (209.00) and balance (2,400,006.29) sit on the
        // date line; "4.50" is a foreign-txn fee percentage on a later line
        // and must not be mistaken for the balance.
        const text = [
            '14Jul25 DC TXN PKR 200.00 ON 13/JUL 209.00 2,400,006.29',
            'APPLE.COM/BILL ITUNES.COM IE',
            'INTERNATIONAL TXN. FEE PERCENT 4.50',
        ].join('\n');
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(1);
        expect(txs[0].debit_amount).toBe(209);
        expect(txs[0].balance).toBe(2400006.29);
    });

    it('corrects direction via balance continuity when no keyword matches (IBFT credit)', () => {
        // "IBFT <ref> <sender>" has no debit/credit keyword, so the heuristic
        // defaults to debit. The balance rising by exactly the transaction
        // amount proves it was actually a deposit.
        const text = [
            '14Jul25 DC TXN PKR 2500.00 ON 12/JUL 2,500.00 100,000.00',
            '15Jul25 IBFT 23/07/2025 627873 QALAB HUSSNAIN SHAH 2,500.00 102,500.00',
        ].join('\n');
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(2);
        expect(txs[0].debit_amount).toBe(2500);
        expect(txs[1].credit_amount).toBe(2500);
        expect(txs[1].debit_amount).toBeNull();
        expect(txs[1].net_amount).toBe(2500);
    });

    it('repairs a large balance number torn apart by PDF extraction (e.g. "997,6" + "11.25")', () => {
        // Some SCB pages render a balance across two text-drawing operations,
        // so pdfreader's reconstruction inserts a stray space in the middle
        // of the number: "997,611.25" comes out as "997,6" then "11.25".
        // "997,6" is never a valid amount on its own (a thousands group must
        // have exactly 3 digits), so it must be stitched back together.
        const text = [
            '13Feb26 DC TXN PKR 1438.00 ON 10/FEB SOME MERCHANT LAHORE PK 1,438.00 1,041,111.25',
            '16Feb26 DC TXN PKR 43500.00 ON 14/FEB HAJVERY JEWELRY LAHORE PK 43,500.00 997,6 11.25',
        ].join('\n');
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(2);
        expect(txs[1].debit_amount).toBe(43500);
        expect(txs[1].balance).toBe(997611.25);
    });

    it('does not let one unreconcilable balance poison correction for later transactions', () => {
        // Row 2 simulates a balance torn at a clean group boundary (e.g.
        // "1,041,111.25" -> "1,041" + "111.25") which repairTornThousands
        // can't detect, since both fragments already look like valid
        // standalone amounts. That row stays wrong, but the running-balance
        // anchor must not advance to its corrupted value — otherwise every
        // transaction after it would also fail to reconcile against Fix B.
        // Row 3's IBFT credit (no debit/credit keyword) should still get
        // corrected using row 1's balance as the anchor.
        const text = [
            '13Feb26 DC TXN PKR 1438.00 ON 10/FEB SOME MERCHANT LAHORE PK 1,438.00 1,041,111.25',
            '16Feb26 BT PK1BT2602130KEGX JADE E-SERVICES PAKISTAN 1,438.00 1,041 111.25',
            '18Feb26 IBFT SOMEBODY ELSE 1,438.00 1,042,549.25',
        ].join('\n');
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(3);
        expect(txs[2].credit_amount).toBe(1438);
        expect(txs[2].debit_amount).toBeNull();
        expect(txs[2].balance).toBe(1042549.25);
    });
});

describe('parseTransactions — NayaPay format (DD MMM YYYY)', () => {
    it('parses NayaPay date format', () => {
        const text = `01 Apr 2026 Raast In SALARY FROM EMPLOYER +Rs. 20,000 20,000.00`;
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(1);
        expect(txs[0].transaction_date).toEqual(new Date(Date.UTC(2026, 3, 1)));
    });

    it('correctly identifies +Rs. as credit', () => {
        const text = `05 Mar 2026 Raast In RECEIVED FROM AZHAR +Rs. 5,000 25,000.00`;
        const txs = parseTransactions(text);

        expect(txs[0].net_amount).toBe(5000);
        expect(txs[0].credit_amount).toBe(5000);
    });

    it('correctly identifies -Rs. as debit', () => {
        const text = `10 Mar 2026 Card Purchase DARAZ -Rs. 3,500 21,500.00`;
        const txs = parseTransactions(text);

        expect(txs[0].net_amount).toBe(-3500);
        expect(txs[0].debit_amount).toBe(3500);
    });

    it('strips time prefix from description', () => {
        const text = `12 Apr 2026 06:13 PM Raast In RECEIVED PAYMENT +Rs. 10,000 30,000.00`;
        const txs = parseTransactions(text);

        expect(txs[0].description).not.toMatch(/\d{2}:\d{2}/);
    });

    it('strips +Rs. / -Rs. amounts from description', () => {
        const text = `20 Apr 2026 Send Money SENT TO USMAN -Rs. 2,000 18,000.00`;
        const txs = parseTransactions(text);

        expect(txs[0].description).not.toMatch(/Rs\./);
    });

    it('filters NayaPay table header row', () => {
        const text = [
            'Time Type Description',
            '01 Apr 2026 Raast In SALARY +Rs. 50,000 50,000.00',
        ].join('\n');

        const txs = parseTransactions(text);
        expect(txs).toHaveLength(1);
    });
});

describe('parseTransactions — Generic date format (DD/MM/YYYY)', () => {
    it('parses DD/MM/YYYY date format', () => {
        const text = `01/03/2026 WITHDRAWAL 5,000.00 95,000.00`;
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(1);
        expect(txs[0].transaction_date).toEqual(new Date(Date.UTC(2026, 2, 1)));
    });

    it('parses DD-MM-YYYY date format', () => {
        const text = `15-04-2026 PAYMENT 10,000.00 85,000.00`;
        const txs = parseTransactions(text);

        expect(txs).toHaveLength(1);
        expect(txs[0].transaction_date).toEqual(new Date(Date.UTC(2026, 3, 15)));
    });
});

// ─── validateBalance ──────────────────────────────────────────────────────────

describe('validateBalance', () => {
    const txs = [
        { net_amount: -5000 },
        { net_amount: 50000 },
        { net_amount: -3000 },
    ];

    it('returns valid when calculated balance matches closing balance', () => {
        const result = validateBalance(txs, 100000, 142000);
        expect(result.isValid).toBe(true);
    });

    it('returns invalid when balances do not match', () => {
        const result = validateBalance(txs, 100000, 999999);
        expect(result.isValid).toBe(false);
        expect(result.difference).toBeGreaterThan(0);
    });

    it('returns valid with a warning when balance data is missing', () => {
        const result = validateBalance(txs, null, null);
        expect(result.isValid).toBe(true);
        expect(result.warning).toBeDefined();
    });

    it('returns valid with warning when transactions array is empty', () => {
        const result = validateBalance([], 100000, 100000);
        expect(result.isValid).toBe(true);
    });

    it('returns correct calculated closing balance', () => {
        const result = validateBalance(txs, 100000, 142000);
        expect(result.calculatedClosing).toBe(142000);
    });
});
