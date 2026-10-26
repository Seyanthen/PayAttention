# Sprint 1 finance rules

- Money uses integer minor units: `1250` means `$12.50`.
- Transaction amounts are non-negative; type supplies the sign.
- Income increases an account balance; expense decreases it.
- Account balance is opening balance plus income minus expenses.
- Total balance is the sum of account balances.
- Monthly totals use inclusive calendar-month boundaries.
- Net cash flow is monthly income minus monthly expenses.

Executable examples and unit tests are in `finance_rules.py` and `test_finance_rules.py`.
