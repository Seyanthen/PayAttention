# Backend Implementation Notes

This document explains what has been added to the `backend/` folder, how the pieces work together, and what the other roles should do as the project grows.

## What was added

### Project setup

- `manage.py` is the Django command-line entry point.
- `config/settings.py` configures Django, Django REST Framework, PostgreSQL, token authentication, CORS, UTC time handling, and environment variables.
- `config/urls.py` connects the admin site, token authentication, and versioned API routes.
- `config/asgi.py` and `config/wsgi.py` provide deployment entry points.
- `requirements.txt` lists Django, Django REST Framework, PostgreSQL support, CORS support, and environment-variable support.
- `.env.example` documents the local configuration values without storing real secrets.

### Finance application

The `finance/` package contains the application's financial domain.

- `models.py` defines the PostgreSQL-backed entities:
  - `Account` stores checking, savings, cash, credit, and other accounts.
  - `Category` stores income and expense categories.
  - `Transaction` stores income, expenses, and transfers.
  - `Budget` stores a category budget and its date range.
- Every financial record is owned by a Django user.
- Foreign keys use protective deletion where deleting a record could invalidate financial history.
- Constraints, indexes, and ownership relationships are defined at the database layer.
- `migrations/0001_initial.py` creates the initial schema.

### API integration

- `serializers.py` converts database objects to JSON and validates API input.
- `permissions.py` prevents users from accessing another user's records.
- `views.py` provides authenticated CRUD endpoints and finance-specific endpoints.
- `urls.py` registers the API routes with a Django REST Framework router.
- `openapi.yaml` documents the initial API contract for the React Native client.

The main endpoints are:

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/token/` | Exchange username/password for an API token |
| `GET /api/v1/health/` | Check whether the API is available |
| `GET /api/v1/me/` | Return the authenticated user |
| `/api/v1/accounts/` | Create and manage user-owned accounts |
| `/api/v1/categories/` | Create and manage income and expense categories |
| `/api/v1/transactions/` | Create and manage income, expense, and transfer records |
| `/api/v1/budgets/` | Create and manage category budgets |
| `GET /api/v1/summary/?start=YYYY-MM-DD&end=YYYY-MM-DD` | Return expense totals by category |

The mobile client should send the token in the request header:

```text
Authorization: Token <token>
```

### Finance calculations

`services.py` keeps authoritative financial calculations on the backend.

- `account_balance_minor()` calculates opening balance plus income, minus expenses, minus outgoing transfers, plus incoming transfers.
- `budget_spent_minor()` totals expense transactions in a budget's category and date range.
- `spending_summary()` totals expenses by category for a requested date range.

Money is represented as integer minor units. For US dollars, `1250` means `$12.50`. This avoids floating-point rounding errors. The mobile UI should display these values as currency but should not replace the backend's calculations.

Dates use `YYYY-MM-DD` for calendar dates, and Django timestamps use UTC.

### Tests and documentation

- `tests.py` covers integer-unit balance calculations, user ownership isolation, and invalid summary date ranges.
- `admin.py` registers finance models for local inspection through Django Admin.
- `README.md` contains setup instructions, endpoint summaries, and database notes.
- `openapi.yaml` is the starting contract for UI/backend integration.

## How a request works

1. The React Native client requests a token from `/api/v1/auth/token/`.
2. The client sends the token with each protected API request.
3. Django REST Framework authenticates the token and identifies the user.
4. The view filters records to that user and validates the request through a serializer.
5. Django reads or writes PostgreSQL through the model layer.
6. Finance services calculate balances and summaries from persisted records.
7. The serializer returns a stable JSON response to the UI.

## Local setup

From the `backend/` folder:

```text
python -m venv .venv
python -m pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The PostgreSQL database described in `.env` must exist before migrations run. Use a separate database and credentials for development, testing, and production.

Run the backend tests with:

```text
python manage.py test
```

## Next steps for the other roles

### Mobile UI role

- Build a typed API client for the endpoints in `openapi.yaml`.
- Add token storage using the platform's secure storage facility.
- Build screens for sign-in, accounts, transactions, budgets, categories, and spending summaries.
- Treat `amount_minor` as an integer and format it only at the presentation layer.
- Handle loading, empty, validation-error, unauthorized, server-error, and retry states.
- Confirm that UI field names match serializer and OpenAPI field names exactly.
- Add UI tests for creating a transaction, viewing a balance, creating a budget, and recovering from an API error.

### Database role

- Review the initial models and confirm names, types, constraints, indexes, and deletion behavior.
- Verify the PostgreSQL migration from a clean database and against representative fixture data.
- Review query plans as transaction history grows.
- Define backup, restore, retention, and export procedures.
- Coordinate every schema change with the backend role so migrations and API compatibility remain aligned.

### Finance basics lead

- Approve the rules for refunds, pending transactions, split transactions, transfers, recurring items, and negative balances.
- Confirm currency, rounding, timezone, and budget-period conventions.
- Provide expected-input/expected-output examples for each rule.
- Review user-facing labels and warnings so the UI does not present estimates as guarantees or regulated financial advice.
- Turn each approved rule into a backend test case and update this document when behavior changes.

### QA/testing role

- Convert `openapi.yaml` and the finance rules into contract and acceptance tests.
- Add tests for cross-user access attempts, invalid foreign keys, duplicate records, date boundaries, pagination, and expired tokens.
- Test money edge cases including large amounts, zero/negative values, rounding, refunds, and transfers.
- Add API integration tests against PostgreSQL rather than relying only on mocked data.
- Add an end-to-end smoke path covering sign-in, account creation, transaction creation, balance display, budget creation, and summary display.
- Configure CI to install `requirements.txt`, run migrations, run tests, and fail on high-severity regressions.

## Coordination rules for future changes

Before adding a feature, document:

1. The user-visible behavior and finance rule.
2. The database model or migration impact.
3. The API request and response changes.
4. The mobile UI states and error behavior.
5. The tests required at each affected layer.

Breaking API changes should be versioned or introduced with a backward-compatible transition. Never commit secrets or real financial data. When a financial rule changes, update the finance service, API documentation, and corresponding tests together.

