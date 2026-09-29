# QA / Testing

This folder contains the quality strategy, test inventory, reusable templates, and release gates for Pay Attention.

The QA role protects correctness, privacy, usability, and integration quality across the React Native client, Django API, and PostgreSQL database. The backend currently provides the first executable test surface; mobile and database test suites should be added as those components become available.

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
python manage.py test
```

The backend tests currently cover integer-unit balance calculation, authenticated ownership scoping, and invalid summary date ranges. Add API, migration, and edge-case coverage as behavior is implemented.

## Test data rules

- Use synthetic accounts, users, merchants, and amounts only.
- Keep fixtures small, deterministic, and anonymized.
- Do not commit tokens, passwords used outside local test accounts, production exports, or real financial information.
- Treat `backend/openapi.yaml`, backend serializers/services, database documentation, and approved finance rules as test oracles.

## Ownership

QA owns the test inventory, execution evidence, regression plan, and defect reports. Backend, database, mobile, and finance leads own the behavior and contracts that QA verifies. Changes to financial rules must update the finance documentation and the corresponding QA cases together.
