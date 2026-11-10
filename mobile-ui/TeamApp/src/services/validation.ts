export type ValidationErrors = Record<string, string | undefined>;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;
const POSITIVE_MINOR_UNIT_PATTERN = /^[1-9]\d*$/;
const POSITIVE_DOLLAR_PATTERN = /^\$?\d+(?:\.\d{1,2})?$/;

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

/** Convert a user-entered dollar amount to integer minor units without float math. */
export function parseDollarAmountToMinorUnits(value: string, allowZero = false): number | undefined {
  const trimmed = value.trim();
  if (!POSITIVE_DOLLAR_PATTERN.test(trimmed)) return undefined;

  const normalized = trimmed.startsWith("$") ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const whole = Number(wholePart);
  const cents = Number(fractionalPart.padEnd(2, "0"));
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(cents)) return undefined;

  const minorUnits = whole * 100 + cents;
  return Number.isSafeInteger(minorUnits) && (allowZero ? minorUnits >= 0 : minorUnits > 0) ? minorUnits : undefined;
}

export function formatMinorUnitsAsDollars(value: number): string {
  return `$${(value / 100).toFixed(2)}`;
}

export function validatePositiveDollarAmount(value: string, label = "Amount"): string | undefined {
  return parseDollarAmountToMinorUnits(value) === undefined
    ? `${label} must be a positive dollar amount with up to two decimal places.`
    : undefined;
}

export function validateNonNegativeDollarAmount(value: string, label = "Amount"): string | undefined {
  return parseDollarAmountToMinorUnits(value, true) === undefined
    ? `${label} must be a non-negative dollar amount with up to two decimal places.`
    : undefined;
}

export function validateTransactionFilters(input: {
  startDate: string;
  endDate: string;
  minAmountDollars: string;
  maxAmountDollars: string;
  transactionType: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};
  const startDateError = input.startDate.trim() ? validateIsoDate(input.startDate, "Start date") : undefined;
  const endDateError = input.endDate.trim() ? validateIsoDate(input.endDate, "End date") : undefined;
  if (startDateError) errors.startDate = startDateError;
  if (endDateError) errors.endDate = endDateError;
  if (!startDateError && !endDateError && input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.endDate = "End date must be on or after start date.";
  }

  for (const [key, value, label] of [
    ["minAmountDollars", input.minAmountDollars, "Minimum amount"],
    ["maxAmountDollars", input.maxAmountDollars, "Maximum amount"],
  ] as const) {
    if (value.trim()) {
      const error = validateNonNegativeDollarAmount(value, label);
      if (error) errors[key] = error;
    }
  }
  const minAmount = parseDollarAmountToMinorUnits(input.minAmountDollars, true);
  const maxAmount = parseDollarAmountToMinorUnits(input.maxAmountDollars, true);
  if (!errors.minAmountDollars && !errors.maxAmountDollars && minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
    errors.maxAmountDollars = "Maximum amount must be greater than or equal to minimum amount.";
  }
  if (input.transactionType && !["expense", "income", "transfer"].includes(input.transactionType)) {
    errors.transactionType = "Select a valid transaction type.";
  }
  return errors;
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
  amountDollars: string;
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
  const amountError = validatePositiveDollarAmount(input.amountDollars);
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
