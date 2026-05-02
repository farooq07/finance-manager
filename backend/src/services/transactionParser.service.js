import Decimal from 'decimal.js';

/**
 * Parse transactions from extracted PDF text
 * Pakistani bank statements typically have format:
 * Date | Description | Debit | Credit | Balance
 */
export function parseTransactions(rawText) {
    const lines = rawText.split('\n').filter(l => l.trim());
    const transactions = [];

    // Regex patterns for Pakistani bank statements
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
    const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip headers, footers, and metadata
        if (isHeaderOrFooter(line) || line.length < 10) continue;

        const dateMatch = line.match(datePattern);
        if (!dateMatch) continue;

        const transaction = extractTransactionFromLine(line, dateMatch[1]);
        if (transaction && (transaction.debit_amount || transaction.credit_amount)) {
            transactions.push(transaction);
        }
    }

    return transactions;
}

/**
 * Extract single transaction from line
 */
function extractTransactionFromLine(line, dateStr) {
    try {
        const parts = line.split(/\s{2,}/); // Split by 2+ spaces (typical bank formatting)

        if (parts.length < 3) return null;

        const description = extractDescription(parts);
        const { debit, credit, balance } = extractAmounts(parts);

        if (!debit && !credit) return null;

        return {
            transaction_date: parseDate(dateStr),
            description: description.substring(0, 255),
            debit_amount: debit ? new Decimal(debit).toNumber() : null,
            credit_amount: credit ? new Decimal(credit).toNumber() : null,
            net_amount: credit
                ? new Decimal(credit).toNumber()
                : new Decimal(debit).negated().toNumber(),
            balance: balance ? new Decimal(balance).toNumber() : null
        };
    } catch (error) {
        console.error(`Failed to parse transaction: ${error.message}`);
        return null;
    }
}

/**
 * Extract description (usually 2nd-4th parts)
 */
function extractDescription(parts) {
    return parts.slice(1, -3).join(' ').trim().substring(0, 255);
}

/**
 * Extract amounts from line parts
 */
function extractAmounts(parts) {
    const amounts = parts.slice(-3).map(cleanAmount);
    return {
        debit: amounts[0] || null,
        credit: amounts[1] || null,
        balance: amounts[2] || null
    };
}

/**
 * Clean amount string (remove currency, commas, etc)
 */
function cleanAmount(str) {
    if (!str) return null;
    const cleaned = str.replace(/[^0-9.,-]/g, '').trim();
    return cleaned || null;
}

/**
 * Parse date string (handles DD/MM/YYYY, DD-MM-YYYY, etc)
 */
function parseDate(dateStr) {
    const parts = dateStr.split(/[-\/]/);
    let day, month, year;

    if (parts.length === 3) {
        [day, month, year] = parts.map(Number);

        // Handle 2-digit year
        if (year < 100) {
            year += year < 50 ? 2000 : 1900;
        }

        return new Date(year, month - 1, day);
    }

    return new Date();
}

/**
 * Check if line is header/footer/metadata
 */
function isHeaderOrFooter(line) {
    const lowerLine = line.toLowerCase();
    const keywords = [
        'date', 'description', 'debit', 'credit', 'balance',
        'statement', 'page', 'total', 'opening', 'closing',
        'branch', 'account', 'period', 'report'
    ];

    return keywords.some(kw => lowerLine.includes(kw));
}

/**
 * Reconcile transactions against opening/closing balance
 */
export function validateBalance(transactions, openingBalance, closingBalance) {
    if (!openingBalance || !closingBalance || transactions.length === 0) {
        return { isValid: true, warning: 'Missing balance data for validation' };
    }

    let runningBalance = new Decimal(openingBalance);

    for (const tx of transactions) {
        const amount = new Decimal(tx.net_amount);
        runningBalance = runningBalance.plus(amount);
    }

    const calculated = runningBalance.toNumber();
    const expectedClosing = parseFloat(closingBalance);
    const difference = Math.abs(calculated - expectedClosing);

    return {
        isValid: difference < 0.01, // Allow 0.01 rounding difference
        calculatedClosing: calculated,
        expectedClosing: expectedClosing,
        difference: difference
    };
}
