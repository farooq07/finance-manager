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

    it('keeps amounts and dates', () => {
        const line = '02-Mar-2026 SALARY CREDIT 1,250,000.00 12500000.00 95,000.00';
        expect(redactStatementText(line).text).toBe(line);
    });

    it('counts redactions', () => {
        const { redactions } = redactStatementText('PK36SCBL0000001123456702 0300-1234567 a@b.co');
        expect(redactions).toBe(3);
    });
});
