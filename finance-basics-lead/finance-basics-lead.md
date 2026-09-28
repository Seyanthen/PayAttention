# Role: Finance Basics Lead

## Mission

Define the product's financial rules and terminology so the app gives users understandable, consistent, and trustworthy guidance.

## Responsibilities

- Define the minimum viable concepts: income, expense, transfer, account, category, budget, recurring item, available balance, and spending period.
- Write plain-language rules for how transactions affect balances, budgets, cash flow, and summaries.
- Decide how refunds, pending transactions, transfers, split transactions, negative balances, missing categories, and deleted items behave.
- Establish currency, rounding, date/timezone, month boundary, and fiscal-period conventions.
- Provide realistic user journeys and acceptance criteria for common budgeting tasks.
- Review labels, copy, charts, and warnings for financial clarity; avoid presenting estimates as guarantees or regulated advice.

## Integration contract

- Maintain a single glossary and rules document referenced by mobile, backend, database, and QA.
- Approve examples with exact expected results so backend calculations and QA assertions use the same truth.
- Ensure every finance rule has an owner, an example, and a test case before implementation is considered complete.
- Flag jurisdiction-dependent or potentially regulated features early for appropriate review.

## Definition of done

- The team agrees on the calculation rules for balances, budgets, and summaries.
- Edge cases have expected outcomes and sample data.
- UI wording is understandable to someone with no accounting background.
- Changes to financial rules are versioned and communicated before release.

