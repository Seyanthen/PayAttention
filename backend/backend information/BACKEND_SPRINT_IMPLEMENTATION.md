# Backend/API Sprint Implementation

## Scope

This sprint implements and secures account and transaction CRUD operations:

- `GET`, `POST`, `PUT`, and `DELETE` for accounts
- `GET`, `POST`, `PUT`, and `DELETE` for transactions
- Authentication and owner-based authorization
- Input and cross-record validation
- Consistent use of Django REST Framework error responses
- Automated tests for isolation and CRUD behavior

The canonical existing API remains under `/api/v1/`. The same finance routes are also available under `/api/` for clients using the sprint route names. Both use trailing slashes, for example `/api/accounts/` and `/api/v1/accounts/`.

## What changed

### Authentication

`config/settings.py` already enables DRF token authentication and makes protected API views require an authenticated user by default. Clients obtain a token from:

```text
POST /api/v1/auth/token/
POST /api/auth/token/
```

They send it on protected requests as:

```text
Authorization: Token <token>
```

The health endpoint remains public.

### Authorization and ownership

`OwnedModelViewSet` filters every list and detail queryset by `request.user`. This means a user cannot list, retrieve, update, or delete another user's accounts or transactions. A cross-user detail request returns `404`, which avoids revealing whether the other user's record exists.

Transactions also contain foreign keys to accounts, categories, and transfer destinations. `TransactionSerializer` now verifies that every referenced object belongs to the authenticated user during both create and update. This closes the important update gap where a user could previously change their own transaction to reference another user's account.

The owner is assigned from the authenticated request in `perform_create`; it is never accepted from client input.

### Validation

Account validation now trims names, rejects blank names, and normalizes three-letter currency codes to uppercase. Transaction currencies receive the same validation. Existing finance rules remain active:

- Amounts must be positive integer minor units.
- Transfers require a destination account.
- Non-transfers cannot specify a destination account.
- A transfer cannot use the same source and destination account.
- Income transactions require income categories when a category is supplied.
- Expense transactions require expense categories when a category is supplied.

Invalid input uses DRF's standard `400` JSON field-error format. Unauthenticated requests return `401`, and inaccessible records are not exposed through the owner-filtered querysets.

### Routes

`config/urls.py` now exposes both route prefixes:

| Purpose | Versioned route | Unversioned route |
|---|---|---|
| Accounts | `/api/v1/accounts/` | `/api/accounts/` |
| Transactions | `/api/v1/transactions/` | `/api/transactions/` |
| Token auth | `/api/v1/auth/token/` | `/api/auth/token/` |

The versioned routes preserve compatibility with the existing mobile/API documentation. The unversioned aliases support the sprint's requested route names without breaking existing clients.

## How this interacts with the rest of the project

### Mobile UI

The mobile client should authenticate once, securely store the token, and send the `Authorization: Token ...` header with every account and transaction request. It can use either route prefix, but `/api/v1/` is the recommended canonical prefix for new client code.

Money remains integer minor units: `1250` means `$12.50`. Dates use `YYYY-MM-DD`. The backend owns balance calculations and should remain the source of truth for account balances and summaries.

The UI should handle these states:

- `401`: sign in again or refresh authentication
- `400`: show field-level validation messages
- `404`: remove or refresh a record that is no longer available
- `500`: show a retryable server-error state

### Database

The existing models provide the ownership foreign keys, unique account names per owner, protective transaction foreign keys, and indexes used by owner/date queries. This sprint does not require a schema migration. If future changes add fields or constraints, create a migration and update the API serializers and tests together.

### QA/testing

`finance/tests.py` now covers:

- Unauthenticated account access
- Account create, update, and delete
- Account list isolation
- Cross-user account detail and delete isolation
- Rejection of foreign accounts during transaction creation
- Rejection of foreign accounts during transaction updates
- Transaction create, retrieve, update, and delete
- Cross-user transaction detail isolation
- Existing balance and summary validation behavior

QA should additionally run these tests against PostgreSQL and verify both `/api/` and `/api/v1/` route prefixes.

### API documentation

`openapi.yaml` remains the starting contract for the client. It should be kept synchronized with the chosen route prefix, token authentication scheme, request fields, and error responses whenever the API changes.

## Verification

From the `backend/` directory:

```text
python manage.py check
python manage.py test
```

The commands require the configured PostgreSQL database from `.env`. A clean test run should confirm authentication, owner isolation, validation, and CRUD behavior before the mobile team integrates the endpoints.
