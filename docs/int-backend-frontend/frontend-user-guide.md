# Frontend User Guide

## Prerequisites

- Docker Engine and Docker Compose CLI.
- Node.js 22+ (for local development without Docker).
- Git repository with backend and frontend source.

## Start the local stack

1. Clone or update the repository to the feature branch.
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and set a secure PostgreSQL password:
   ```bash
   POSTGRES_PASSWORD=your_secure_local_password
   ```
4. Build and start all services:
   ```powershell
   docker compose up --build
   ```
5. Wait for all services to become healthy:
   ```
   ✔ Container kpi-system-postgres-1  Healthy
   ✔ Container kpi-system-backend-1   Started
   ✔ Container kpi-system-frontend-1  Healthy
   ```

## Stop the local stack

```powershell
docker compose down
```

To remove persistent data:
```powershell
docker compose down -v
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_DB` | `kpi_system` | Database name |
| `POSTGRES_USER` | `kpi_app` | Database user |
| `POSTGRES_PASSWORD` | `change_me_for_local_development` | **CHANGE THIS** for local development |
| `BACKEND_PORT` | `8080` | Host port for backend service |
| `FRONTEND_PORT` | `4001` | Host port for frontend service |

PostgreSQL is not published to a host port; it is accessible only to containers on the `kpi-system` network.

## Access the application

### Frontend
- **URL:** `http://localhost:4001` (or port set by `FRONTEND_PORT`)
- **Expected behavior:** Initial page displays backend health status.
- **Expected HTTP response:** `200 OK` with HTML content.

### Backend health check
- **URL:** `http://localhost:8080/health` (or port set by `BACKEND_PORT`)
- **Expected response:**
  ```json
  {
    "success": true,
    "message": "Service is healthy.",
    "data": { "status": "healthy" },
    "meta": {
      "request_id": "<uuid>",
      "timestamp": "2026-08-22T10:52:11.762Z"
    }
  }
  ```
- **Expected HTTP response:** `200 OK`

## Validation checklist

- [ ] `docker compose up` starts without errors.
- [ ] All three containers reach healthy/started state.
- [ ] `http://localhost:4001` displays a page (frontend loaded).
- [ ] `http://localhost:8080/health` returns a JSON response with `"success": true`.
- [ ] The frontend page displays "API status: healthy" after a moment (frontend API client works).

## Current behavior

- The initial frontend screen fetches the backend health status using the typed API client.
- The page displays the result to verify the frontend-backend communication contract works.
- No domain features (employee management, evaluation, scoring, workflow, authentication) are implemented.

## Current limitations

- **No employee management:** Employee records cannot be created, read, updated, or deleted.
- **No evaluation templates:** KPI templates are not available.
- **No scoring:** Evaluation scoring engine is not implemented.
- **No workflow:** Evaluation status transitions and approval workflows are not implemented.
- **No imports:** CSV import is not available.
- **No authentication:** No login or authorization is enforced; the health endpoint is public.
- **No audit:** Historical change tracking is not implemented.
- **No reporting:** Evaluation reports and analytics are not available.

These features will be implemented in future development phases.
