export type ValidationErrors = Record<string, string | undefined>;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;
const POSITIVE_MINOR_UNIT_PATTERN = /^[1-9]\d*$/;

export function required(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `${label} is required.`;
}

export function validateCurrency(value: string): string | undefined {
  if (!value.trim()) return "Currency is required.";
  return CURRENCY_PATTERN.test(value.trim())
    ? undefined
    : "Currency must be a three-letter code, such as USD.";
}

export function parsePositiveMinorUnits(value: string): number | undefined {
  const trimmed = value.trim();
  if (!POSITIVE_MINOR_UNIT_PATTERN.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function validatePositiveMinorUnits(value: string, label = "Amount"): string | undefined {
  return parsePositiveMinorUnits(value) === undefined
    ? `${label} must be a positive whole number of minor units.`
    : undefined;
}

export function validateIsoDate(value: string, label = "Date"): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (!ISO_DATE_PATTERN.test(trimmed)) return `${label} must use YYYY-MM-DD format.`;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed
    ? `${label} must be a valid calendar date.`
    : undefined;
}

export type TransactionValidationInput = {
  merchant: string;
  amountMinor: string;
  date: string;
  transactionType: "expense" | "income" | "transfer";
  categoryType?: "expense" | "income";
  account: string;
  transferAccount?: string;
  currency?: string;
};

export function validateTransaction(input: TransactionValidationInput): ValidationErrors {
  const errors: ValidationErrors = {};
  const merchantError = required(input.merchant, "Description");
  const amountError = validatePositiveMinorUnits(input.amountMinor);
  const dateError = validateIsoDate(input.date);
  const accountError = required(input.account, "Account");
  if (merchantError) errors.merchant = merchantError;
  if (amountError) errors.amountMinor = amountError;
  if (dateError) errors.occurredOn = dateError;
  if (accountError) errors.account = accountError;
  if (input.currency) {
    const currencyError = validateCurrency(input.currency);
    if (currencyError) errors.currency = currencyError;
  }

  if (input.transactionType === "transfer" && !input.transferAccount?.trim()) {
    errors.transferAccount = "Transfers require a destination account.";
  }
  if (input.transactionType !== "transfer" && input.transferAccount?.trim()) {
    errors.transferAccount = "Only transfers can specify a destination account.";
  }
  if (input.transactionType === "expense" && input.categoryType !== "expense") {
    errors.category = "Expense transactions require an expense category.";
  }
  if (input.transactionType === "income" && input.categoryType !== "income") {
    errors.category = "Income transactions require an income category.";
  }
  return errors;
}

export function validateBudget(input: {
  name: string;
  amountMinor: string;
  startDate: string;
  endDate: string;
  currency: string;
  categoryType?: "expense" | "income";
}): ValidationErrors {
  const errors: ValidationErrors = {};
  const nameError = required(input.name, "Budget name");
  const amountError = validatePositiveMinorUnits(input.amountMinor);
  const startError = validateIsoDate(input.startDate, "Start date");
  const endError = validateIsoDate(input.endDate, "End date");
  const currencyError = validateCurrency(input.currency);
  if (nameError) errors.name = nameError;
  if (amountError) errors.amountMinor = amountError;
  if (startError) errors.periodStart = startError;
  if (endError) errors.periodEnd = endError;
  if (!startError && !endError && input.endDate < input.startDate) {
    errors.periodEnd = "The budget period must end on or after it starts.";
  }
  if (currencyError) errors.currency = currencyError;
  if (input.categoryType !== "expense") errors.category = "Budgets require an expense category.";
  return errors;
}
