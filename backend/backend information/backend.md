# Role: Backend

## Mission

Build the Python/Django service that authenticates users, enforces business rules, exposes a stable API, and coordinates persistence in PostgreSQL.

## Responsibilities

- Design versioned, documented API endpoints for users, accounts, transactions, categories, budgets, and summaries.
- Enforce authorization at the object level so users can access only their own financial data.
- Validate all input on the server, including dates, currencies, amounts, category ownership, and budget periods.
- Put financial calculations in tested service/domain code rather than duplicating them across views or the mobile client.
- Use Django migrations, transactions, constraints, indexes, and pagination appropriately.
- Return consistent status codes and a stable error shape, such as field errors plus a safe human-readable message.
- Add structured logging, health checks, rate limiting where needed, and environment-based configuration for secrets.

## Integration contract

- Publish an API contract (OpenAPI or equivalent) before client implementation and update it with every breaking or additive change.
- Use a canonical money representation: integer minor units or exact decimal values; document precision and rounding rules.
- Standardize UTC timestamps, ISO-8601 date formats, IDs, pagination, filtering, and sorting.
- Coordinate schema changes with the database lead and provide backward-compatible migrations when possible.
- Coordinate acceptance criteria and regression coverage with QA before merging endpoint changes.

## Definition of done

- Unit and integration tests cover authentication, permissions, CRUD behavior, calculations, validation, and edge cases.
- Migrations run from a clean database and preserve existing data.
- API documentation includes examples and error responses.
- Sensitive values are excluded from logs, responses, fixtures, and test output.

