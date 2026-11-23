# Backend Hardening Engineering Report

## Executive summary

The backend already enforced authenticated, owner-scoped querysets for its primary resources. This hardening pass strengthened configuration failure modes, request validation, operational logging, transport-related defaults, one high-frequency balance calculation, readiness reporting, throttling, optional pagination, correlation IDs, CI PostgreSQL verification, and container deployment basics.

## Work completed

- Configuration now fails fast in non-debug mode when `DJANGO_SECRET_KEY` is missing; debug/test runs use a generated ephemeral key.
- Added opt-in `PAYATTENTION_TESTING=1` SQLite mode so tests cannot use configured PostgreSQL data.
- Added security defaults for secure cookies, content-type sniffing, referrer policy, and frame protection; HTTPS redirect remains explicitly environment-controlled.
- Added structured console logging for Django request warnings and the finance application logger without logging request bodies or credentials.
- Tightened currency validation across account, transaction, budget, goal, and recurring-transaction serializers to ASCII three-letter codes rather than Unicode alphabetic characters.
- Reduced `account_balance_minor()` from four aggregate queries to one aggregate query while preserving transfer semantics.
- Added tests for protected reporting/export endpoints, public health behavior, cross-user budget mutation isolation, and validation failures.
- Added `/api/health/ready/` database readiness checks.
- Added configurable anonymous/user throttles and on-demand limit/offset pagination without changing legacy list responses.
- Added validated `X-Request-ID` response correlation IDs.
- Added GitHub Actions PostgreSQL service verification and a non-root Gunicorn Docker deployment baseline with health checks.

## Files/components changed

- `backend/config/settings.py`
- `backend/.env.example`
- `backend/finance/serializers.py`
- `backend/finance/services.py`
- `backend/finance/tests.py`
- `backend/backend information/BACKEND_HARDENING_REPORT.md`
- `.github/workflows/backend-postgres.yml`
- `deployment/Dockerfile`
- `deployment/docker-compose.yml`
- `deployment/README.md`
- `.dockerignore`

## Tests and commands executed

- `python manage.py check` — passed before hardening; the later default run correctly requires a secret in non-debug mode.
- `python manage.py test` — blocked by remote PostgreSQL connectivity before test setup: `psycopg.OperationalError`, connection to Neon host port 5432 failed with Windows error `10013`.
- `PAYATTENTION_TESTING=1` with an ephemeral `DJANGO_SECRET_KEY`: `python manage.py check` — passed.
- `PAYATTENTION_TESTING=1` with an ephemeral `DJANGO_SECRET_KEY`: `python manage.py test` — passed, `Ran 35 tests in 43.126s`, `OK`.
- `PAYATTENTION_TESTING=1` with an ephemeral `DJANGO_SECRET_KEY`: `python manage.py check` and `python manage.py test` — passed, `Ran 39 tests in 19.453s`, `OK`.
- Elevated local PostgreSQL branch run: `python manage.py check`, `python manage.py migrate --noinput`, and tests — check/migrations passed; `Ran 38 tests in 65.667s`, `OK`, but teardown failed because Neon reported `ObjectInUse` for `test_neondb`.
- Elevated local PostgreSQL branch run with unique `POSTGRES_TEST_NAME` and `--keepdb`: `Ran 39 tests in 43.092s`, `OK`; test database was intentionally preserved because Neon pooling prevents Django teardown.
- The GitHub Actions workflow was added but not executed in this environment; it will run on push/pull request in GitHub against a disposable PostgreSQL 16 service.

## Remaining risks and recommendations

- PostgreSQL migrations, indexes, TLS behavior, and production startup still require a reachable disposable PostgreSQL instance or CI service; SQLite does not replace that verification.
- A prior remote PostgreSQL verification encountered connection and teardown limitations; current repeatable verification uses isolated SQLite tests and the committed PostgreSQL CI workflow.
- Refresh-token/session lifecycle and an audit trail are outside the current implementation.
- Correlation IDs are returned in responses and included in request context, but logs remain console-oriented rather than centralized JSON/audit logging.
- Some reporting paths calculate derived values per returned object; query-count profiling should be considered if dataset size grows.
- Deployment configuration is a baseline only: secret-manager integration, backups, rollback, and TLS termination remain infrastructure-specific.
- OpenAPI should be regenerated/reviewed against the implemented routes and response fields.

## Recommended next steps

1. Run the suite and migrations against disposable PostgreSQL in CI.
2. Profile reporting endpoints if dataset size grows and optimize any measured query-count hotspots.
3. Keep OpenAPI and release documentation synchronized with route changes.
4. Define infrastructure-owned secret, backup, rollback, and TLS procedures if deployment scope changes.
