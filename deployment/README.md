# Deployment baseline

The Docker image runs Gunicorn as a non-root user with bounded worker timeout and stdout/stderr logging. The compose file expects database credentials from `backend/.env`; do not commit that file or place production secrets in the compose file.

Required production environment values include `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, a restricted `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and PostgreSQL connection values. Configure `DJANGO_SECURE_SSL_REDIRECT=1` when TLS is terminated by the application or forwarded headers are correctly handled by the edge proxy.

The container health check uses `/api/health/ready/`, which verifies database connectivity. Run migrations as a separate release step before routing traffic to a new image. Backups, rollback, TLS termination, secret-manager integration, and horizontal scaling remain infrastructure-specific responsibilities.
