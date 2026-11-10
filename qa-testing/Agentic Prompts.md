## Agentic Prompt: Standardize User-Facing Money Input in Dollars

You are working on the PayAttention project.

### Objective

Update all user-facing expense and income input flows so users enter monetary amounts in US dollars rather than integer minor units or cents.

Before making any code changes, inspect the entire project and identify every location where users enter an expense, income, budget, goal, account balance, recurring transaction, or other monetary value.

Report the qualifying locations to the requester and wait for confirmation before modifying those additional locations.

### Required changes

At minimum, evaluate and update:

- Creating a recurring transaction.
- Creating a single transaction.

User-facing monetary inputs must:

- Accept dollar amounts such as `10`, `10.5`, or `10.50`.
- Display or describe the expected format as US dollars.
- Support cents using the format `$xxx.xx`.
- Reject invalid values such as negative amounts where not supported, non-numeric input, malformed decimals, or empty values.
- Convert dollars to integer minor units before sending data to the backend.
- Never use floating-point arithmetic for persisted financial values.
- Preserve the existing backend integer-minor-unit convention.

Examples:

- User enters `10` → send `1000` minor units.
- User enters `10.5` → send `1050` minor units.
- User enters `10.50` → send `1050` minor units.
- User enters `0.99` → send `99` minor units.

### Discovery and approval workflow

Before changing code:

1. Search the project for all monetary input fields and amount parsing logic.
2. Identify every screen, component, service, test, and documentation location that may qualify.
3. Pay particular attention to:
   - Single transaction creation and editing.
   - Recurring transaction creation and editing.
   - Budget creation and editing.
   - Savings goal creation and editing.
   - Account opening balances.
   - Any import, seed, demo, or administrative money-entry flows.
4. Report the findings to the requester.
5. Do not modify the additional qualifying locations until the requester confirms the scope.

The recurring transaction and single transaction flows are required scope unless the requester directs otherwise.

### Frontend behavior

Use the existing Expo, React Native, and TypeScript architecture.

For each approved input:

- Use a clear dollar-oriented label or placeholder, such as:
  - `Amount in dollars`
  - `$0.00`
- Keep the input user-friendly on mobile.
- Normalize or validate the input before submission.
- Prevent accidental floating-point precision errors.
- Show a useful validation message for malformed amounts.
- Preserve existing loading, saving, retry, and server-error behavior.
- Keep income and expense behavior unchanged aside from the input format.

Create a shared money parsing/formatting helper if multiple screens need the same behavior. Avoid duplicating parsing logic across screens.

The helper should:

- Accept dollar strings.
- Allow at most two decimal places.
- Convert safely to integer minor units.
- Reject invalid or unsafe values deterministically.
- Avoid JavaScript floating-point multiplication such as `Number(value) * 100` without safe validation.

### Backend behavior

Do not change the database schema or the backend integer-minor-unit contract unless absolutely necessary.

The backend should continue to receive and store integer minor units.

Verify that:

- Existing APIs remain compatible.
- Validation still rejects zero or invalid amounts where required.
- Existing money calculations remain integer-based.
- No endpoint begins storing dollar strings or floating-point values.

### Testing requirements

Add or update tests for approved flows covering:

- Whole-dollar input.
- Dollar-and-cent input.
- One-decimal input.
- Values below one dollar.
- Leading and trailing whitespace.
- Empty input.
- Alphabetic input.
- More than two decimal places.
- Negative input where invalid.
- Zero input where invalid.
- Correct conversion to minor units.
- No floating-point rounding errors.

Update relevant fixtures or test helpers to use deterministic synthetic values.

Do not change unrelated UI behavior.

### Verification

After approval and implementation:

- Run relevant frontend linting.
- Run TypeScript checks as far as the project environment permits.
- Run relevant backend checks and tests.
- Verify API payloads contain integer minor units.
- Confirm no duplicate money parsing logic was introduced.
- Confirm existing transaction and recurring-transaction functionality still works.

### Final report

Report:

- All locations discovered during the initial audit.
- Which locations were approved and changed.
- Files modified.
- The shared parsing/formatting approach used.
- Tests and checks run.
- Any pre-existing failures.
- Any remaining locations not changed because they were outside the approved scope.