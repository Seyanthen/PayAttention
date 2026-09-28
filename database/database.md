# Role: Database

## Mission

Design and maintain a reliable PostgreSQL data model that preserves financial accuracy, supports useful queries, and can evolve safely.

## Responsibilities

- Model users, accounts, transactions, categories, budgets, budget periods, and audit metadata with clear ownership relationships.
- Use appropriate PostgreSQL types, including exact numeric/decimal or integer minor-unit money fields, timezone-aware timestamps, and constrained status values.
- Add foreign keys, unique constraints, check constraints, indexes, and cascade behavior deliberately.
- Keep schema changes in reviewed Django migrations; never make undocumented production-only edits.
- Plan indexes around real API queries such as user/date filters, account history, category summaries, and budget periods.
- Define seed/reference data strategy for default categories and test fixtures.
- Consider privacy, retention, backups, restore testing, and least-privilege database access.

## Integration contract

- Publish an entity/data dictionary with field names, types, nullability, allowed values, ownership rules, and money/date conventions.
- Agree with backend on transaction boundaries and consistency requirements for imports, edits, transfers, and budget updates.
- Avoid exposing database table structure directly as an accidental public API; backend serializers define the contract.
- Review query plans and migration impact with the backend lead before adding high-volume features.
- Provide representative, anonymized fixtures so mobile and QA can test realistic financial scenarios.

## Definition of done

- The schema can be created from scratch using the repository's documented setup process.
- Migrations are reversible where practical and tested against representative data.
- Constraints prevent invalid or orphaned financial records.
- Backup, restore, and data-export expectations are documented.

