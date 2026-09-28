# Agent Guide

## Project

Pay Attention is a financial tracking and budgeting application for college students. It will help users track expenses such as food, tuition, and jobs while creating and monitoring budgets.

The project is being built by a five-person team. The current shared communication channel is Microsoft Teams.

## Technology direction

- Mobile client: TypeScript with React Native
- Backend API: Python with Django
- Database: PostgreSQL
- API contract: document endpoint paths, request/response shapes, errors, IDs, dates, and money representation before client integration

The final application shape (mobile app, website, or both) is still being decided. Do not assume a web-only architecture without documenting the decision.

## Team roles

Role-specific requirements live in these files:

- [Mobile UI](mobile-ui/mobile-ui.md)
- [Backend](backend/backend.md)
- [Database](database/database.md)
- [Finance Basics Lead](finance-basics-lead/finance-basics-lead.md)
- [QA / Testing](qa-testing/qa-testing.md)

## Shared engineering rules

1. Keep financial calculations authoritative on the Django backend and use exact money values. Use integer minor units or documented decimal strings; never use floating-point arithmetic for money.
2. Use UTC timestamps and documented ISO-8601 formats. Document timezone and month-boundary behavior for every date-based financial calculation.
3. Enforce authentication, ownership, and validation on the backend. Client-side validation improves usability but is not a security boundary.
4. Treat Django migrations as the source of truth for database changes. Add constraints and indexes deliberately, and test migrations from a clean database.
5. Keep API contracts stable. Coordinate changes across the mobile, backend, database, finance, and QA roles before merging.
6. Do not commit secrets, real financial data, tokens, passwords, or personally identifying test data.
7. Prefer small, focused commits and descriptive pull requests. Include tests and documentation when behavior or contracts change.

## Required workflow for changes

Before implementation:

- Identify which role documents are affected.
- Confirm the finance rule and expected behavior for edge cases.
- Define or update the API and data contracts.

During implementation:

- Keep types, serializers, migrations, and UI models aligned.
- Add tests at the layer where the behavior belongs and contract tests at integration boundaries.
- Provide loading, empty, validation-error, server-error, and retry states in user-facing flows.

Before merging:

- Run relevant unit, integration, migration, and UI tests.
- Check authorization and privacy implications.
- Update the applicable role document, API documentation, glossary, or README.
- Describe database migrations, compatibility concerns, and manual verification steps in the pull request.
- Wait for user approval before pushing generated files to Github.

## Current repository guidance

The repository is currently documentation-first. Preserve existing team documentation unless the requested change specifically updates it. When adding application code, organize it by responsibility and add setup instructions to `README.md`.

