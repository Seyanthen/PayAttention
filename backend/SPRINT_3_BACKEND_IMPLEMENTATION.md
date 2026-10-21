# Sprint 3 Backend/API Implementation

## Completed scope

Sprint 3 completes the account and transaction foundation, adds category and budget APIs, and introduces basic month-based reporting. The existing versioned routes remain available under `/api/v1/`; the same routes are also available under `/api/` for the sprint contract.

## Endpoints

### Category CRUD

The existing router now supports:

```text
GET    /api/categories/
POST   /api/categories/
GET    /api/categories/{id}/
PUT    /api/categories/{id}/
DELETE /api/categories/{id}/
```

Categories are automatically owned by the authenticated user. Lists and detail operations are owner-scoped. Names are trimmed and blank names are rejected.

### Budget CRUD

The existing router now supports:

```text
GET    /api/budgets/
POST   /api/budgets/
GET    /api/budgets/{id}/
PUT    /api/budgets/{id}/
DELETE /api/budgets/{id}/
```

Budgets can only use expense categories owned by the authenticated user. This ownership validation applies to both create and update. Budget detail responses include `spent_minor` and `remaining_minor` for the budget's full period.

### Budget period endpoints

```text
GET /api/budgets/current/
GET /api/budgets/{month}/
```

`{month}` uses `YYYY-MM`, for example `/api/budgets/2026-01/`. A budget is included when its date range overlaps the requested month. Spending is calculated only within the overlap between the budget period and requested month.

The response includes:

- `period_start`
- `period_end`
- `budgets`
- `total_budget_minor`
- `total_spent_minor`
- `total_remaining_minor`

Each budget entry includes the normal budget fields plus `spent_minor` and `remaining_minor`.

`/current/` uses the server's local Django date and returns the current calendar month's boundaries.

### Current-month summary

```text
GET /api/summary/current-month/
```

This uses the same reporting structure as the existing date-range summary endpoint, but automatically selects the current calendar month. It returns total expenses and expense totals grouped by category.

## Authorization and validation

All new endpoints require token authentication. The owner-scoped viewset queryset prevents users from seeing or modifying another user's categories or budgets. Serializer validation additionally prevents:

- Budgets referencing another user's category
- Budgets referencing income categories
- Invalid budget date ranges
- Blank category or budget names
- Invalid currency codes

The existing account and transaction protections remain active, including validation that transaction-related accounts and categories belong to the current user.

## Interaction with other project areas

### Mobile UI

The mobile client should send:

```text
Authorization: Token <token>
```

It can use `/api/` or `/api/v1/`, but `/api/v1/` is the recommended canonical prefix. The UI should format integer minor-unit values such as `1250` as `$12.50` and should not calculate authoritative spending totals locally.

For the new screens, the client can use:

- Categories for category selection and management
- Budgets for CRUD and budget detail
- Budgets/current for the dashboard's current-month budget cards
- Budgets/{month} for historical month navigation
- Summary/current-month for current-month spending charts or totals

### Database

No schema changes were required for this sprint. Existing owner foreign keys, category constraints, budget date constraints, and owner/date indexes support the new queries.

### QA

Tests cover category ownership, budget spending calculations, current-month report structure, invalid month input, foreign-category rejection, income-category rejection, and existing account/transaction isolation. QA should verify both route prefixes and test users with different accounts/categories/budgets.

## Verification

From `backend/`:

```text
python manage.py check
python manage.py test
```

The test suite requires a reachable PostgreSQL database with credentials configured in `backend/.env`.
