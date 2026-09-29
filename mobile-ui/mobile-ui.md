# Role: Mobile UI

## Mission

Build the React Native application in TypeScript: screens, navigation, forms, charts, accessibility, loading states, and error handling for the financial tracking and budgeting experience.

## Responsibilities

- Create a consistent design system for colors, typography, spacing, buttons, inputs, cards, and financial charts.
- Build authentication, dashboard, transactions, budgets, categories, and settings screens.
- Keep UI state separate from server state; use typed API clients and predictable caching/loading behavior.
- Never calculate authoritative balances or totals only on the device. Display values returned by the Django API and clearly label pending or unsynced data.
- Validate input for usability, while treating backend validation as the source of truth.
- Support accessibility, small screens, offline/error states, secure token storage, and safe handling of sensitive financial information.

## Integration contract

- Coordinate with the backend lead before changing endpoint paths, request bodies, response shapes, pagination, or error formats.
- Generate or maintain TypeScript types from the agreed API schema where practical. Dates, currency amounts, IDs, and nullable fields must have explicit types.
- Use integer minor units (for example, cents) or a documented decimal string for money; never use JavaScript floating-point arithmetic for financial calculations.
- Use the database/backend team's canonical category, account, transaction, and budget IDs rather than display names as identifiers.
- Surface server errors in a user-friendly way without exposing stack traces or sensitive data.

## Definition of done

- Each screen has loading, empty, success, validation-error, server-error, and retry states.
- Navigation guards protect authenticated routes and handle expired sessions.
- Components have tests for important interactions and accessibility labels.
- A short screen/API mapping is documented whenever a new feature is added.
