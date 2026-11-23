# QA / Testing

This folder is the single entry point for QA strategy, traceability, reusable templates, and release gates across the React Native client, Django API, and PostgreSQL database.

## Start here

1. [`qa-testing.md`](qa-testing.md) — responsibilities and definition of done.
2. [`qa information/TEST_STRATEGY.md`](qa%20information/TEST_STRATEGY.md) — test levels, risks, environments, and evidence.
3. [`qa information/TRACEABILITY.md`](qa%20information/TRACEABILITY.md) — requirements mapped to test IDs.
4. [`qa information/TEST_CASE_TEMPLATE.md`](qa%20information/TEST_CASE_TEMPLATE.md) and [`qa information/BUG_REPORT_TEMPLATE.md`](qa%20information/BUG_REPORT_TEMPLATE.md) — case and defect templates.
5. [`qa information/RELEASE_CHECKLIST.md`](qa%20information/RELEASE_CHECKLIST.md) — milestone and release gates.
6. [`qa information/GITHUB_QA_WORKFLOW.md`](qa%20information/GITHUB_QA_WORKFLOW.md) — issue and pull-request QA flow.

## Verification commands

Run from `backend/`:

```powershell
python manage.py check
python manage.py test --keepdb --noinput
```

Run from `mobile-ui/TeamApp/`:

```powershell
npx.cmd tsc --noEmit
```

Current baseline: `python manage.py check` passes. The backend test command discovers 39 tests but the local PostgreSQL test database is blocked by an existing `finance_savingsgoal` table. The mobile type check currently reports missing Playwright types and existing React Native web type errors.

## Local phone testing

From the repository root, run:

```powershell
.\qa-testing\start-local.ps1
```

The script detects the active LAN address, updates the ignored local `.env` files, and starts Django and Expo in separate windows. Run it again after changing networks. Expo must be restarted after an address change because it embeds `EXPO_PUBLIC_*` values at startup.

## Test data rules

- Use synthetic accounts, users, merchants, and amounts only.
- Keep fixtures small, deterministic, and anonymized.
- Store money as integer minor units, such as `1250` for USD $12.50.
- Never commit tokens, passwords, production exports, or real financial information.
- Treat `backend/openapi.yaml`, backend serializers/services, database documentation, and approved finance rules as test oracles.

## Ownership

QA owns the test inventory, execution evidence, regression plan, and defect reports. Backend, database, mobile, and finance leads own the behavior and contracts that QA verifies. Changes to financial rules must update the finance documentation and corresponding QA cases together.
