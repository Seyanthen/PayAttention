# Role: QA / Testing

## Mission

Protect correctness, privacy, usability, and integration quality across the React Native client, Django API, and PostgreSQL data layer.

## Responsibilities

- Turn finance rules and API contracts into traceable test cases and acceptance criteria.
- Build a test pyramid: Python unit/service tests, Django API/integration tests, database migration tests, and React Native component/end-to-end tests.
- Test authentication, authorization, validation, pagination, retries, network failures, offline behavior, accessibility, and device sizes.
- Prioritize money-specific cases: decimal precision, rounding, timezones, month boundaries, duplicate imports, transfers, refunds, splits, and concurrent updates.
- Use anonymized fixtures and never place real financial credentials or personal financial data in the repository.
- Run smoke tests in CI and report reproducible defects with environment, steps, expected result, actual result, and evidence.

## Integration contract

- Treat the API schema, database data dictionary, and finance glossary as test oracles.
- Maintain contract tests that catch mismatched field names, types, nullability, status codes, and error shapes.
- Coordinate test data with the database lead and expected financial outcomes with the finance lead.
- Verify that UI displays server-calculated values correctly and does not introduce floating-point errors.
- Gate releases on critical-path tests for sign-in, adding a transaction, viewing balances, creating a budget, and recovering from API failure.

## Definition of done

- Every user story has acceptance tests and a risk-based regression plan.
- Critical defects are resolved or explicitly accepted by the team.
- CI reports actionable results and blocks merges on agreed high-severity failures.
- A release checklist confirms migrations, API compatibility, security basics, accessibility, and rollback readiness.

