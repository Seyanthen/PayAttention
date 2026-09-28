# QA Traceability Matrix

Update this matrix when a user story, finance rule, API endpoint, or data contract changes. IDs are stable labels for test cases and defects.

| Requirement / contract | Current source of truth | Acceptance coverage | Automation status |
|---|---|---|---|
| Health endpoint is public and returns healthy status | `backend/finance/views.py`, `backend/openapi.yaml` | `API-001` | Planned |
| Authentication returns a token for valid credentials and rejects invalid credentials | `backend/config/urls.py`, `backend/openapi.yaml` | `AUTH-001`, `AUTH-002` | Planned |
| Protected endpoints require authentication | `backend/finance/views.py` | `AUTH-003` | Planned |
| Users can access only their own records | `backend/finance/permissions.py`, viewsets | `SEC-001` | Partial: account list covered |
| Money uses integer minor units | `backend/backend information/README.md`, serializers/models | `FIN-001`, `FIN-002` | Partial: balance arithmetic covered |
| Balance includes opening balance, income, expenses, and transfers | `backend/finance/services.py` | `FIN-003` | Partial: expense case covered |
| Transaction category matches transaction type | `backend/finance/serializers.py` | `VAL-001` | Planned |
| Transfers require a destination account and only transfers may specify one | `backend/finance/serializers.py` | `FIN-004`, `VAL-002` | Planned |
| Budgets require expense categories and valid inclusive periods | `backend/finance/serializers.py`, model constraint | `BUD-001`, `BUD-002` | Planned |
| Summary requires ISO dates and end >= start | `backend/finance/views.py` | `SUM-001`, `SUM-002` | Partial: invalid range covered |
| Summary totals expense transactions by category for the requested range | `backend/finance/services.py` | `SUM-003` | Planned |
| UI displays server-calculated values without floating-point recalculation | `mobile-ui/mobile-ui.md`, API contract | `UI-001` | Planned; mobile client pending |
| Critical path supports sign-in, account, transaction, balance, budget, and API recovery | `qa-testing/qa-testing.md` | `E2E-001` through `E2E-006` | Planned |

## Status meanings

- `Covered`: repeatable test exists and is passing in the current baseline.
- `Partial`: some behavior is covered, but important variants or layers remain.
- `Planned`: case is defined but not yet implemented or executed.

Do not mark a row covered solely because the implementation looks correct; link the test and its latest evidence.
