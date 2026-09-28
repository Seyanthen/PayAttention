# GitHub QA Workflow

Use GitHub issues, pull requests, and project views as the system of record for QA work. Keep this workflow lightweight until the team agrees on a specific board configuration.

## Issue types

- **Test case**: a repeatable check linked to a requirement or finance rule.
- **Bug**: a behavior that does not meet the documented contract or acceptance criteria.
- **Regression**: a previously passing behavior that no longer passes.
- **Test debt**: missing automation, environment work, fixture work, or documentation.
- **Release risk**: a known limitation requiring an explicit owner and disposition.

## Recommended labels

`qa`, `bug`, `regression`, `test-debt`, `api`, `database`, `mobile`, `finance-rules`, `security`, `accessibility`, `ci`, `P0`, `P1`, `P2`, `P3`.

Use one severity/priority label and at least one area label. Avoid labels that duplicate the issue title.

## Project flow

`Backlog` → `Ready for QA` → `In QA` → `Blocked` or `Passed` → `Done`

Move an item to `Ready for QA` only when the change has acceptance criteria, test data or setup notes, and a link to the relevant API/finance/UI contract. Move it to `Passed` only with evidence or a linked automated run.

## Pull request QA expectations

Every behavior-changing pull request should include:

- requirement, finance rule, or issue link;
- test case IDs added or updated;
- commands and environment used;
- migration and API contract impact;
- manual verification steps for UI or integration behavior;
- known limitations and rollback considerations.

QA should verify the change against the traceability matrix and request updates when the implementation, contract, or tests disagree.

## Defect triage

Use the bug template. A P0 blocks release. A P1 normally blocks release unless the team explicitly accepts the risk. Every accepted risk needs an owner, rationale, affected scope, and follow-up issue. Link the regression test to the fixing pull request before closing a regression defect.
