# Backend QA Test Run Guide

Use this guide when validating a backend change locally or in CI. Run commands from the `backend/` directory.

## Prerequisites

- Python environment created and dependencies installed from `requirements.txt`.
- PostgreSQL test database configured through the local environment settings.
- No production credentials or financial data in the environment or test output.

## Baseline run

```text
python manage.py check
python manage.py test
```

## Focused runs

```text
python manage.py test finance
python manage.py test finance.tests.FinanceApiTests.test_account_balance_uses_integer_minor_units
```

## Required review notes

For a pull request, record:

- commit or pull request under test;
- commands and database version used;
- passed, failed, skipped, or blocked results;
- migration and API contract impact;
- manual API checks, if applicable;
- linked QA case IDs and sanitized evidence;
- linked defects and their severity.

## Current baseline coverage

The existing `backend/finance/tests.py` covers integer-unit balance arithmetic, authenticated account ownership scoping, and invalid summary date ranges. It does not yet cover the full contract. Use `qa-testing/qa information/TRACEABILITY.md` to identify planned gaps before calling a change release-ready.
