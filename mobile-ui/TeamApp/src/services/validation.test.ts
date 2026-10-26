import { validateBudget, validateCurrency, validateTransaction, validatePositiveMinorUnits } from './validation';

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertEmpty(value: unknown, message: string) {
  if (Object.keys(value as object).length !== 0) throw new Error(`${message}: expected no errors`);
}

assertEqual(validatePositiveMinorUnits(''), undefined, 'empty amount');
assertEqual(validatePositiveMinorUnits('-1'), undefined, 'negative amount');
assertEqual(validatePositiveMinorUnits('1.25'), undefined, 'decimal amount');
assertEqual(validatePositiveMinorUnits('NaN'), undefined, 'NaN amount');
assertEqual(validateCurrency('US'), 'Currency must be a three-letter code, such as USD.', 'invalid currency');

assertEqual(validateCurrency('usd'), undefined, 'valid currency');
assertEqual(validatePositiveMinorUnits('1250'), 1250, 'valid amount');
assertEmpty(validateTransaction({
    merchant: 'Groceries',
    amountMinor: '1250',
    date: '2026-10-26',
    transactionType: 'expense',
    categoryType: 'expense',
    account: 'checking-id',
}), 'valid transaction');

const transactionErrors = validateTransaction({
    merchant: 'Transfer',
    amountMinor: '100',
    date: '10/26/2026',
    transactionType: 'transfer',
    account: 'checking-id',
});
assertEqual(transactionErrors.occurredOn, 'Date must use YYYY-MM-DD format.', 'invalid date');
assertEqual(transactionErrors.transferAccount, 'Transfers require a destination account.', 'missing transfer destination');

const budgetErrors = validateBudget({
    name: 'October',
    amountMinor: '5000',
    startDate: '2026-10-31',
    endDate: '2026-10-01',
    currency: 'USD',
    categoryType: 'expense',
});
assertEqual(budgetErrors.periodEnd, 'The budget period must end on or after it starts.', 'invalid budget range');
