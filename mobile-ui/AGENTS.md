# AGENTS.md

## Project Overview

This project is a React Native mobile application built with Expo and TypeScript.

When working in this repository, prioritize simple, maintainable solutions that are consistent with the existing codebase.

## Getting Started

Install dependencies:

```bash
npm install

Start the Expo development server:
npx expo start

Before adding a new dependency, check whether the project already contains a package that provides the needed functionality.

Project Structure
Follow the existing project structure.
Typical directories may include:
- app/ - application screens and routes
- components/ - reusable UI components
- hooks/ - custom React hooks
- services/ - API calls and external services
- utils/ - shared utility functions
- assets/ - images, fonts, and other static assets
Do not create new top-level directories unless there is a clear reason.

Coding Guidelines
- Use TypeScript.
- Prefer functional React components.
- Use React hooks rather than class components.
- Keep components small and focused.
- Extract reusable UI into components when appropriate.
- Avoid duplicating existing functionality.
- Follow existing naming and formatting conventions.
- Prefer clear code over clever or unnecessarily complex code.
- Do not modify unrelated code while completing a task.

TypeScript
Avoid using any unless there is a strong reason.
Define interfaces or types for:
- Component props
- API responses
- Application data
- Function parameters when TypeScript cannot infer them clearly
Reuse existing types when possible.
React Native
Use React Native components and APIs appropriately.
Avoid assumptions based on normal web development. For example, do not introduce HTML elements or browser-specific APIs unless the project explicitly supports them.
Consider both Android and iOS behavior when making UI or platform-related changes.
Expo
Prefer Expo-supported libraries when they satisfy the requirement.
Do not eject from Expo or introduce native configuration changes unless the task specifically requires them.
Check compatibility with the Expo SDK version used by this project before adding Expo packages.
Navigation
Follow the navigation system already used by the project.
Do not introduce a second navigation framework without explicit approval.
Keep route and screen naming consistent with the existing application.
API and Data
Keep networking and API logic separate from presentation components when practical.
Do not hard-code:
- API keys
- Passwords
- Access tokens
- Secrets
- Environment-specific credentials
Use the project's existing environment-variable or configuration system.
Handle API failures and loading states appropriately.
Dependencies
Before installing a package:
1. Check whether the functionality already exists in the project.
2. Prefer existing dependencies when appropriate.
3. Verify that the package is compatible with the project's React Native and Expo versions.
4. Avoid adding large dependencies for functionality that can be implemented simply.
Do not remove or upgrade unrelated dependencies unless required.
Making Changes
Before editing:
1. Understand the user's requested behavior.
2. Inspect the relevant existing code.
3. Identify related components, types, services, and tests.
4. Follow existing patterns where reasonable.
While editing:
- Make the smallest reasonable change that solves the problem.
- Avoid unrelated refactoring.
- Preserve existing behavior unless the task requires changing it.
- Update related types when necessary.
Testing and Verification
After making changes:
1. Check for TypeScript errors.
2. Run relevant tests if available.
3. Run linting if configured.
4. Verify that imports and dependencies resolve correctly.
5. Check for obvious regressions in related functionality.
Useful commands may include:
npm test
npm run lint
npx tsc --noEmit

Only run commands that are actually supported by the project.
If a test or check fails, determine whether the failure was introduced by the current change before modifying unrelated code.
Error Handling
Do not silently ignore errors.
When appropriate:
- Show useful error states to users.
- Log useful diagnostic information during development.
- Avoid exposing sensitive information in user-facing error messages.
Comments and Documentation
Add comments when they explain something that is not obvious from the code itself.
Avoid comments that simply repeat what the code does.
Update documentation when a change affects:
- Setup
- Configuration
- Commands
- Architecture
- Public interfaces
- Developer workflow
Git and Scope
Keep changes focused on the requested task.
Do not:
- Rewrite unrelated files.
- Delete code without understanding why it exists.
- Change formatting across the entire project unnecessarily.
- Commit secrets or credentials.
Do not create commits, push branches, or modify remote repositories unless explicitly requested.
When Requirements Are Unclear
Inspect the existing codebase for established patterns before making assumptions.
If an ambiguity could significantly affect architecture, user experience, data, security, or compatibility, ask for clarification rather than making a major assumption.
For small implementation details, prefer the pattern already established in the codebase.
Definition of Done
A task is complete when:
- The requested behavior is implemented.
- The implementation follows existing project conventions.
- Relevant TypeScript checks pass.
- Relevant tests and linting pass when available.
- No unnecessary dependencies were introduced.
- No unrelated code was modified.
- Important assumptions or limitations are communicated.