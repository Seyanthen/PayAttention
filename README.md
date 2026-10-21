# ₱ay Attention
Expense Tracker: A program that helps users track their daily expenses and maintaining budgets

## Team Members
Joshua Adams, Luce Dewitt, Jack Edwards, Thu Dong, Lincoln Hanks

## Software Description
A financial tracking app/website (tbd). It will help college students keep track of their finances (food, tuition, jobs). It will also allow the user to create budgets.

## Architecture
Pay Attention uses a client-server architecture with a mobile/web client, a Django REST API, and a PostgreSQL database.

### Client

The client is in `mobile-ui/TeamApp` and is built with TypeScript, React Native, and Expo Router. It supports Android, iOS, and web through React Native Web. File-based routes in `src/app` provide the login flow and authenticated application screens for the dashboard, accounts, transactions, budgets, goals, and settings. The client communicates with the backend through the typed service modules in `src/services`, using the versioned `/api/v1/` API and token authentication.

### Backend/API

The backend is in `backend` and is built with Python, Django, and Django REST Framework. The `finance` app exposes authenticated CRUD endpoints for accounts, categories, transactions, and budgets, along with health, current-user, and spending-summary endpoints. Serializers validate request data, owner-based permissions isolate each user's financial records, and service functions keep balance, budget, and spending calculations on the server. The canonical API prefix is `/api/v1/`; compatible unversioned `/api/` routes are also available.

### Data layer

PostgreSQL is the system of record and is accessed through Django models and migrations. Users own their accounts, categories, transactions, and budgets. Foreign keys, unique constraints, check constraints, indexes, and protective deletion rules preserve data integrity and support common owner/date queries. Monetary values are represented as integer minor units (for example, `1250` represents `$12.50`), while dates use `YYYY-MM-DD` and timestamps use UTC.

### Request flow

1. The client sends username and password credentials to the token endpoint.
2. The API returns a token, which the client sends as `Authorization: Token <token>` on protected requests.
3. Django REST Framework authenticates the request and limits queries to the authenticated user's records.
4. Serializers validate the request, Django persists changes through the model layer, and finance services calculate derived values such as balances and summaries.
5. The API returns JSON responses for the client to display.

The repository also includes an OpenAPI contract in `backend/openapi.yaml`, automated backend tests, and GitHub Actions/QA documentation for validation and delivery.

## Software Features

* [ ] Mobile Accessibility Apple and Android
* [ ] Budget tracking
* [ ] Budget Analysis

## Team Communication
 Microsoft Teams

## Team Responsibility
 List the name(s) of the team members responsible for these tasks.

|Responsibility                      |Team Member(s)              |
|------------------------------------|----------------------------|
|Conducting Meetings                 |Jack Edwards|
|Maintaining Team Assignment List    |Jack Edwards|
|Ensuring GitHub is Working          |Joshua Adams|
|Maintaining Documentation           |Thu Dong|
|Create & Display Presentations      |Luce DeWitt|
|Submit Team Assignments             |Luce Dewitt, Lincoln Hanks|

## Reflections

## Luce Notes:
## Setting up the software
* [] Download expo
* [] cd into folder
* [] open on expo app'
* [] npx expo start
