# Backend API

This folder contains the Django REST API for Pay Attention. It is the integration boundary between the React Native UI and PostgreSQL.

## Setup

1. Create and activate a virtual environment.
2. Install dependencies with `python -m pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and provide PostgreSQL settings.
4. Run `python manage.py makemigrations finance` and `python manage.py migrate`.
5. Create a local user with `python manage.py createsuperuser`.
6. Start the API with `python manage.py runserver`.

## API contract

All endpoints are under `/api/v1/`. Token authentication is available at `POST /api/v1/auth/token/` with `username` and `password`. Send the returned token as `Authorization: Token <token>`.

- `GET /api/v1/health/` — unauthenticated health check
- `GET /api/v1/me/` — current user
- `GET|POST /api/v1/accounts/` and `GET|PATCH|DELETE /api/v1/accounts/{id}/`
- `GET|POST /api/v1/categories/` and `GET|PATCH|DELETE /api/v1/categories/{id}/`
- `GET|POST /api/v1/transactions/` and `GET|PATCH|DELETE /api/v1/transactions/{id}/`
- `GET|POST /api/v1/budgets/` and `GET|PATCH|DELETE /api/v1/budgets/{id}/`
- `GET /api/v1/summary/?start=YYYY-MM-DD&end=YYYY-MM-DD` — expense summary by category

Money is represented as integer minor units. For USD, `1250` means `$12.50`. Dates are ISO-8601 calendar dates and timestamps are UTC.

## Database notes

The default configuration uses PostgreSQL. SQLite is intentionally not the default because PostgreSQL behavior, constraints, and indexes are part of the application contract. The migration files should be generated and committed after dependencies are installed.

