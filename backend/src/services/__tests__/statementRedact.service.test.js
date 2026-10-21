import { redactStatementText } from '../statementRedact.service.js';

describe('redactStatementText', () => {
    it('masks account and card numbers (8+ digit runs)', () => {
        const { text } = redactStatementText('Account No: 01234567890123 Card 4111111111111111');
        expect(text).not.toMatch(/01234567890123|4111111111111111/);
        expect(text).toContain('[ACCOUNT]');
    });

    it('masks IBANs', () => {
        const { text } = redactStatementText('IBAN: PK36SCBL0000001123456702');
        expect(text).toBe('IBAN: [IBAN]');
    });

    it('masks CNIC numbers', () => {
        const { text } = redactStatementText('CNIC 35202-1234567-1 verified');
        expect(text).toBe('CNIC [CNIC] verified');
    });

    it('masks mobile numbers', () => {
        expect(redactStatementText('Call 0300-1234567').text).toBe('Call [PHONE]');
        expect(redactStatementText('Call +923001234567').text).toBe('Call [PHONE]');
    });

    it('masks email addresses', () => {
        expect(redactStatementText('mail ali.khan@example.com now').text).toBe('mail [EMAIL] now');
    });

    it('masks labelled name and address lines', () => {
        const { text } = redactStatementText('Account Title: MUHAMMAD ALI KHAN\nAddress: House 12, Street 4, Lahore');
        expect(text).toBe('Account Title: [NAME]\nAddress: [ADDRESS]');
    });

    it.each([
        ['IBAN with spaces', 'IBAN: PK36 SCBL 0000 0011 2345 6702', /PK36|6702/],
        ['card in groups of 4', 'Card 4111 1111 1111 1111 used', /4111/],
        ['CNIC with spaces', 'CNIC 35202 1234567 1 ok', /35202|1234567/],
        ['phone +92 with spaces', 'Call +92 300 1234567', /300|1234567/],
        ['phone 0300-123-4567', 'Call 0300-123-4567', /0300|4567/],
        ['phone 92-300-1234567', 'Call 92-300-1234567', /300|1234567/],
        ['reference after a dot', 'IBFT Ref.12345678901 done', /12345678901/],
    ])('masks %s', (_label, input, leak) => {
        expect(redactStatementText(input).text).not.toMatch(leak);
    });

    it('masks a name label in the middle of a merged line', () => {
        const { text } = redactStatementText('Account No: 0123456789012 Account Title: MUHAMMAD ALI KHAN  Branch: GULBERG');
        expect(text).not.toMatch(/MUHAMMAD|ALI KHAN/);
        expect(text).toContain('Branch: GULBERG');
    });

    it.each([
        ['Title of Account :', 'Title of Account : SARA AHMED'],
        ['Customer:', 'Customer: SARA AHMED'],
    ])('masks the %s label', (_label, input) => {
        expect(redactStatementText(input).text).not.toMatch(/SARA|AHMED/);
    });

    it('masks extra terms the caller knows, wherever they appear', () => {
        const { text, redactions } = redactStatementText(
            'ALI KHAN\nIBFT TO ali khan 5,000.00\nZARA',
            { extraTerms: ['Ali Khan', 'Zara'] },
        );
        expect(text).toBe('[NAME]\nIBFT TO [NAME] 5,000.00\n[NAME]');
        expect(redactions).toBe(3);
    });

    it('keeps amounts and dates', () => {
        const line = '02-Mar-2026 SALARY CREDIT 1,250,000.00 12500000.00 95,000.00';
        expect(redactStatementText(line).text).toBe(line);
    });

    it('counts redactions', () => {
        const { redactions } = redactStatementText('PK36SCBL0000001123456702 0300-1234567 a@b.co');
        expect(redactions).toBe(3);
    });
});
