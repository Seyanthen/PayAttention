# Sprint 1 finance rules

- Money uses integer minor units: `1250` means `$12.50`.
- Transaction amounts are non-negative; type supplies the sign.
- Income increases an account balance; expense decreases it.
- Account balance is opening balance plus income minus expenses.
- Total balance is the sum of account balances.
- Monthly totals use inclusive calendar-month boundaries.
- Net cash flow is monthly income minus monthly expenses.

Executable examples and unit tests are in `finance_rules.py` and `test_finance_rules.py`.

## Sprint 2 database summary rules

- Account balances are calculated from the stored opening balance and transactions; they are not stored as an authoritative duplicate field.
- Total balance is the sum of every owned account balance.
- Total assets are the sum of non-credit account balances. Credit accounts are treated as liabilities and are still included in account balances and total balance.
- Summary income and expenses use the requested inclusive date range.
- Monthly cash flow is summary income minus summary expenses for the requested reporting month.
- The summary endpoint returns account-level balances plus the aggregate metrics in integer minor units.
