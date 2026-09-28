# QA Test Strategy

## Scope

Verify the complete path from a user action in the mobile client through the Django API and PostgreSQL persistence layer. The current implementation baseline is the backend contract in `backend/openapi.yaml`, the finance models and serializers, and the tests in `backend/finance/tests.py`.

## Test pyramid

| Level | Primary target | Examples | Gate |
|---|---|---|---|
| Unit | Pure rules and serializers | Balance arithmetic, date validation, money validation, category rules | Required for changed behavior |
| API/integration | Django views, auth, ownership, persistence | CRUD status codes, error shapes, cross-user access, summary response | Required for every endpoint change |
| Migration/database | PostgreSQL schema and data safety | Clean migration, constraints, indexes, rollback/forward compatibility | Required for schema changes |
| Component | React Native screens and controls | Form validation, loading/error/empty states, accessibility labels | Required for changed UI |
| End-to-end | Critical user journeys | Sign in, create account, add transaction, view balance, create budget, recover from API failure | Required before release |
| Exploratory | Risk discovery across devices and networks | Small screens, retries, offline transitions, unusual dates and amounts | Required each milestone |

## Risk priorities

### P0: release blockers

- A user can see, change, or delete another user's financial data.
- Balance, budget, or summary calculations are wrong.
- A transaction can be duplicated, lost, or applied to the wrong account.
- Authentication bypass, secret leakage, or unsafe production data in logs/fixtures.
- A migration destroys or corrupts existing financial records.

### P1: high priority

- Invalid amounts, currencies, categories, dates, or budget periods are accepted.
- API and UI disagree about field names, types, nullability, status codes, or money units.
- Critical flows fail without a useful error, retry, or recovery path.
- A release cannot be reproduced from documented setup instructions.

### P2: normal priority

- Pagination, sorting, accessibility, layout, copy, or non-critical empty states regress.

## Required finance coverage

Every change affecting financial data should test:

- `amount_minor` as an integer, including zero/negative validation, large values, and exact totals.
- Income, expense, and transfer effects on account balances.
- Budget inclusive start/end dates and remaining amounts.
- Summary inclusive date boundaries and invalid ranges.
- Refunds, duplicates, imports, splits, pending items, and concurrency once those rules are approved by the finance lead.
- UTC timestamps and calendar-date/month-boundary behavior when timestamps or recurring periods are introduced.

## Environments

| Environment | Purpose | Data policy |
|---|---|---|
| Local | Development and focused debugging | Synthetic data only; isolated database |
| CI | Repeatable smoke and regression checks | Ephemeral database and generated credentials |
| Staging/demo | Cross-layer and release rehearsal | Seeded synthetic data; no production exports |
| Production | Post-release smoke only | Read-only checks; never create test financial records unless an approved procedure exists |

## Evidence standard

Record the commit or pull request, environment, command/device, test result, and relevant logs or screenshots. Redact tokens, passwords, authorization headers, personal data, and any financial data that is not synthetic.

## Exit criteria

- All P0 and P1 cases pass, or an explicit owner accepts the risk.
- Changed code has the appropriate unit, integration, migration, component, or E2E coverage.
- No open critical defect lacks a disposition.
- API and finance documentation match the behavior tested.
- The release checklist is complete and linked to evidence.
