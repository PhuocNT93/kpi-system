# KPI System

## Local development

1. Copy `.env.example` to `.env` and replace the local database password.
2. Install packages in each application:

   ```powershell
   npm --prefix backend install
   npm --prefix frontend install
   ```

3. Start the local stack:

   ```powershell
   docker compose up --build
   ```

The backend health endpoint is available at `http://localhost:8080/health`.
The frontend is available at `http://localhost:4001` by default. Set `BACKEND_PORT` and `FRONTEND_PORT` in `.env` to expose them on different host ports.

## Database migrations

Set `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in the root `.env`, then run migrations through Docker Compose:

```powershell
docker compose run --rm migrate
```

Migration integration tests are destructive only to the explicitly separate `TEST_DATABASE_URL`. The test guard rejects an unset test URL and a URL that matches `DATABASE_URL`.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/kpi_system_test'
npm --prefix backend run test:migrations
```
