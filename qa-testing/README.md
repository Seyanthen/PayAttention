# QA / Testing

This folder contains the quality strategy, test inventory, reusable templates, and release gates for Pay Attention.

The QA role protects correctness, privacy, usability, and integration quality across the React Native client, Django API, and PostgreSQL database. The backend provides the executable API test surface, and the mobile client now has compile-time validation plus implemented authentication and error-handling flows. Dedicated mobile UI tests and end-to-end tests remain outstanding.

## Start here

1. Read [`qa-testing.md`](qa-testing.md) for the role mission, responsibilities, integration contract, and definition of done.
2. Read [`qa information/TEST_STRATEGY.md`](qa%20information/TEST_STRATEGY.md) for the test pyramid, environments, risk priorities, and required evidence.
3. Use [`qa information/TRACEABILITY.md`](qa%20information/TRACEABILITY.md) to connect requirements to acceptance tests and automation.
4. Copy [`qa information/TEST_CASE_TEMPLATE.md`](qa%20information/TEST_CASE_TEMPLATE.md) for new cases and [`qa information/BUG_REPORT_TEMPLATE.md`](qa%20information/BUG_REPORT_TEMPLATE.md) for defects.
5. Complete [`qa information/RELEASE_CHECKLIST.md`](qa%20information/RELEASE_CHECKLIST.md) before a release or milestone demonstration.

## Current execution commands

From `backend/`:

```text
python manage.py check
python manage.py test --keepdb
```

From `mobile-ui/TeamApp/`:

```text
npx tsc --noEmit
```

## Current implementation status

| Requirement | Current status | Evidence / remaining work |
|---|---|---|
| Authentication tokens | Implemented | Django token endpoint and token-authenticated API requests are present. |
| Login persistence | Implemented | Native tokens use `expo-secure-store`; web uses local storage; startup restoration is handled before navigation renders. |
| Logout | Implemented | Dashboard logout clears in-memory and persisted authentication and returns to login. |
| Development testing bypass | Implemented | `__DEV__`-only mock authentication allows UI testing without a backend token; API calls are blocked while mock auth is active. |
| API errors | Partial | Backend validation and client HTTP error normalization exist; broader client API consumers and UI error states remain to be added. |
| Loading states | Partial | Login, auth restoration, and logout have loading states; data screens remain largely static. |
| Network errors | Partial | Client timeout, abort, connection, 401, 429, and 5xx handling exists; retry/offline handling and screen-level recovery remain. |
| Form validation | Partial | Login and backend serializers validate inputs; client forms for accounts, transactions, and budgets are not complete. |
| Backend API integration tests | Blocked | The suite previously passed 13 tests, but the current backend cannot import because `views.py` references missing `budget_spent_minor_for_period` in `finance/services.py`. Restore or remove that contract, then rerun the backend checks. |
| Mobile automated tests | Not implemented | TypeScript compilation passes; no mobile unit/component test runner is configured. |

## Latest verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` from `mobile-ui/TeamApp` | Passed |
| `python manage.py check` from `backend` | Blocked by missing `budget_spent_minor_for_period` import |
| `python manage.py test --keepdb` from `backend` | Blocked by the same import error before tests execute |

The backend tests currently contain 13 API cases covering integer-unit balance calculation, authenticated ownership scoping, CRUD behavior, budget reporting, and invalid date ranges. They must be rerun after the import regression is corrected.

## Test data rules

- Use synthetic accounts, users, merchants, and amounts only.
- Keep fixtures small, deterministic, and anonymized.
- Do not commit tokens, passwords used outside local test accounts, production exports, or real financial information.
- Treat `backend/openapi.yaml`, backend serializers/services, database documentation, and approved finance rules as test oracles.

## Ownership

QA owns the test inventory, execution evidence, regression plan, and defect reports. Backend, database, mobile, and finance leads own the behavior and contracts that QA verifies. Changes to financial rules must update the finance documentation and the corresponding QA cases together.

# Login Integration
Frontend start command:
    npx expo start 

    (Command Prompt terminal in the directory of ...mobile-ui\TeamApp)
      cd D:\CSE310\PayAttention\mobile-ui\TeamApp

Backend start command:
      python manage.py check
      python manage.py test --keepdb --noinput
      python manage.py runserver
      
To start in the Vitrual Environment (in powershell terminal in ...\backend)
      .\.venv\Scripts\python.exe manage.py runserver
    
