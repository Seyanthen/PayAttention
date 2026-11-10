Convert Recurring Transactions to a Dashboard Modal
You are working on the PayAttention Expo React Native application.
Objective
The existing recurring-transactions management screen at:
src/app/(app)/recurring.tsx
is not accessible through the current application flow. Do not expose it as a new Expo tab or standalone navigation page.

Instead, convert recurring-transactions management into a reusable pop-up modal opened directly from the dashboard.
Required behavior
On the dashboard’s Recurring Transactions card:
- The exact show more button opens a recurring-transactions modal in list mode.
- The exact add recurring transaction button opens the same modal directly in create mode.
- Do not use router.push("/recurring").
- Do not add a new tab.
- Do not add a new navigation framework.
- Do not create a new standalone Expo page for this feature.
The modal must allow users to:
- View all active and inactive recurring transactions.
- Add a recurring transaction.
- Edit a recurring transaction.
- Deactivate an active recurring transaction.
- Reactivate an inactive recurring transaction.
- Delete a recurring transaction.
- Retry after loading or server errors.
- Close the modal without losing unrelated dashboard state.
Recommended implementation
Create a reusable component:
src/components/RecurringTransactionsModal.tsx
The component should accept props similar to:
{
  visible: boolean;
  initialMode?: "list" | "create";
  onClose: () => void;
  onChanged?: () => void;
}
Use React Native’s existing Modal component and existing project styling conventions. Prefer a bottom-sheet or centered modal presentation that works on both mobile and web.

Do not add a third-party modal or bottom-sheet dependency.
Dashboard integration
Update:
src/app/(app)/dashboard.tsx
to:
- Track modal visibility with local state.
- Track whether the modal opens in list or create mode.
- Replace both existing router.push calls with modal open handlers.
- Keep the dashboard preview limited to the top four active recurring transactions.
- Refresh the dashboard preview after create, edit, deactivate, reactivate, or delete operations.
- Preserve the existing loading, empty, retry, and error states.
When the modal is closed, the dashboard should remain visible and usable.
Data and API behavior
Continue using the existing API service functions.

The dashboard should request active records only.

The modal should request all records using the explicit inactive-inclusive query behavior.

Keep support for:
- Integer minor-unit money values.
- Weekly, biweekly, and monthly frequency.
- Income and expense types.
- ISO YYYY-MM-DD dates.
- Active/inactive status.
- Authenticated ownership.
Do not change the database schema.
Existing screen handling
Do not make src/app/(app)/recurring.tsx the required route for this feature.

After the modal is integrated:
- Remove any dashboard dependency on the route.
- Decide whether the old route should be deleted or left unused based on the project’s routing conventions.
- Do not leave duplicate management flows that could become inconsistent.
UI states
The modal must support:
- Loading state.
- Empty state.
- Validation errors.
- Server errors.
- Retry action.
- Save-in-progress state.
- Delete-in-progress state.
- Close behavior while saving.
- Clear indication of active versus inactive records.
Use the exact existing button labels where they already apply:
- show more
- add recurring transaction
Additional modal action labels may use normal capitalization, such as:
- Add
- Edit
- Deactivate
- Reactivate
- Delete
- Close
- Save
Testing and verification
Do not add automated visual dashboard tests. The requester will manually verify:
- Dashboard placement.
- Modal appearance.
- show more behavior.
- add recurring transaction behavior.
- Modal close behavior.
- Visual styling.
You should still verify automatically:
- TypeScript compilation for the affected source files.
- Frontend linting.
- API client type correctness.
- Create, edit, deactivate, reactivate, and delete request wiring.
- Dashboard refresh callbacks after mutations.
- No remaining dashboard calls to router.push("/recurring").
- Expo startup or web bundling as far as the environment permits.
Constraints
- Do not modify the database schema.
- Do not add a new Expo tab.
- Do not add a new standalone recurring-transactions page.
- Do not introduce new dependencies.
- Do not redesign unrelated dashboard or transaction features.
- Preserve authentication and ownership behavior.
Final report
Report:
- Files changed.
- Whether recurring.tsx was removed or left unused.
- Modal behavior implemented.
- Checks and tests run.
- Any environment-related failures.
- Any remaining manual UI verification steps.