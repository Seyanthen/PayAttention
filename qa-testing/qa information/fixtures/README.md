# QA Fixtures

This directory is reserved for small, deterministic, anonymized fixtures used by automated or repeatable manual tests.

## Conventions

- Use names such as `qa_user`, `qa_checking`, and `qa_food`; do not use real people or institutions.
- Keep money in integer minor units, for example `1250` for USD $12.50.
- Use fixed ISO dates so boundary assertions remain reproducible.
- Include the expected result beside non-obvious fixture data.
- Prefer factory/builders or generated data over large exported database snapshots.
- Never commit passwords, API tokens, production data, or identifying information.

Add fixture files only when a test needs more than the minimal objects it can create itself. Document the owning test IDs and cleanup expectations in the fixture's README or adjacent metadata.
