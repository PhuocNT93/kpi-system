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
The Swagger UI documentation is available at `http://localhost:8080/api-docs` (OpenAPI JSON spec at `http://localhost:8080/api-docs.json`).
The frontend is available at `http://localhost:4001` by default. Set `BACKEND_PORT` and `FRONTEND_PORT` in `.env` to expose them on different host ports.

### Swagger API Documentation & Authorization
- **Swagger UI**: `http://localhost:3000/api-docs` (or host port mapped via `http://localhost:<PORT>/api-docs`)
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`
- **Testing Protected APIs**:
  1. Register or log in via `POST /api/auth/login` in Swagger UI.
  2. Copy the returned `accessToken` string.
  3. Click the **Authorize** button at the top right of the Swagger UI.
  4. Paste the token into the Value box and click **Authorize**.
  5. All protected endpoints (IAM, Auth change-password) will send the `Authorization: Bearer <token>` header automatically.

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

## Staging deployment

The `staging` branch workflow validates both applications, deploys `frontend/` to Vercel, and triggers the Render deployment for the Express backend. Render connects to Neon through `DATABASE_URL` and runs `npm run migrate:up` with its `preDeployCommand` before starting the new backend version.

Create a GitHub environment named `staging` with these secrets:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `STAGING_API_BASE_URL` (the public Render backend URL)
- `RENDER_DEPLOY_HOOK_URL`

Configure the Render Blueprint from `render.yaml`, set its `DATABASE_URL` to the Neon staging connection string, and configure the Vercel project root directory as `frontend/`. Keep the real Neon URL and provider tokens in provider/GitHub secret storage.

For local staging simulation, the existing Docker Compose file remains available:

```powershell
docker compose --env-file .env.staging.example -f docker-compose.staging.yml config
```

If a Render migration fails, the new backend release does not start; do not automatically roll back the database. Roll back application code through Render/Vercel to a previous deployment after assessing migration compatibility.

---
### List of 4 seed accounts for user login

| Role Code | Role Name | Email | Mật khẩu | Tên người dùng |
| :--- | :--- | :--- | :--- | :--- |
| `EMPLOYEE` | Employee | `employee@kpi.com` | `Password123!` | Employee User |
| `MANAGER` | Manager | `manager@kpi.com` | `Password123!` | Manager User |
| `HR_ADMIN` | HR Administrator | `hradmin@kpi.com` | `Password123!` | HR Admin User |
| `SYSTEM_ADMIN` | System Administrator | `admin@kpi.com` | `Password123!` | System Admin User |
