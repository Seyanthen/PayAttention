# QA Release Checklist

Complete this checklist for a release candidate or milestone demo. Link evidence beside each item when possible.

## Build and environment

- [ ] The documented setup works from a clean checkout.
- [ ] Dependencies install from the committed requirements files.
- [ ] CI runs database migrations and the backend test suite.
- [ ] Test data is synthetic and environment credentials are isolated.

## Backend and API

- [ ] Health and authentication smoke tests pass.
- [ ] Protected endpoints reject unauthenticated requests.
- [ ] Cross-user read, update, and delete attempts are denied.
- [ ] Request validation and error shapes match the API contract.
- [ ] OpenAPI documentation matches implemented routes and fields.
- [ ] Pagination, filtering, sorting, and retry behavior are tested where implemented.

## Financial correctness

- [ ] Integer minor-unit behavior is verified for representative and boundary amounts.
- [ ] Income, expenses, transfers, refunds, and duplicates have approved expected outcomes.
- [ ] Balance, budget, and summary date boundaries are covered.
- [ ] Currency, timezone, and month-boundary rules are documented and tested.
- [ ] Concurrent update behavior is understood or explicitly deferred.

## Database

- [ ] Migrations apply successfully to a clean PostgreSQL database.
- [ ] Constraints prevent invalid or orphaned financial records.
- [ ] Existing representative data survives the migration path.
- [ ] Backup, restore, rollback, and retention concerns have an owner.

## Mobile and usability

- [ ] Sign-in, account, transaction, budget, and summary critical paths pass.
- [ ] Loading, empty, validation-error, server-error, retry, and expired-session states work.
- [ ] Accessibility labels and keyboard/input behavior are checked.
- [ ] Small and large supported device sizes are checked.
- [ ] The client displays server values without floating-point recalculation.

## Defects and sign-off

- [ ] No unresolved P0/P1 defects remain, or an owner has accepted each risk.
- [ ] Regression results and exploratory notes are attached.
- [ ] Rollback or recovery steps are documented.
- [ ] QA owner:
- [ ] Backend owner:
- [ ] Mobile owner:
- [ ] Database/finance review:
- [ ] Date and release identifier:
