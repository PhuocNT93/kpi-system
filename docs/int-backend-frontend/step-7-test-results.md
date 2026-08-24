# Step 7: Test Results

Status: produced during this step.

## Objective
Validate backend/frontend quality, Docker image building, and end-to-end Compose startup with health checks.

## Inputs Reviewed
- Approved test cases from Step 5.

## Actions and Evidence
- Backend: ran `npm test` (vitest); 1 health test passed; `npm run typecheck` passed; `npm run lint` passed.
- Frontend: ran `npm test` (vitest); 2 API-client tests (envelope success/failure) passed; `npm run typecheck` passed; `npm run lint` passed; `npm run build` produced 183.97 kB gzipped bundle.
- Compose: ran `docker compose --env-file .env.example config`; all services/ports/volume resolved.
- Docker builds: ran `docker compose ... up --build`; backend image built in 17s, frontend initial build failed "Could not resolve entry module index.html"; after Dockerfile fix, rebuilt frontend in 22s.
- Compose startup: first attempt failed on PostgreSQL port `5432` (host occupied); removed port mapping; second attempt failed on frontend port `80` (host occupied); changed default to `8080`; third attempt succeeded with all containers healthy.
- Health verification: `curl http://localhost:8080/health` returned `200 OK` with JSON envelope; `curl http://localhost:4001/` returned `200 OK` from Nginx.

## Changes Made
- Updated `frontend/Dockerfile` to copy `index.html`.
- Removed PostgreSQL `ports` from `docker-compose.yml`.
- Changed `.env.example` `BACKEND_PORT` from `4000` to `8080`, `FRONTEND_PORT` from `80` to `4001`.

## Decisions and Rationale
- Frontend Dockerfile must include Vite HTML entry point for production build.
- PostgreSQL port exposure unnecessary since backend uses internal Compose network.
- Unprivileged port `8080` reduces local machine conflicts.

## Risks / Blockers
- None; all test cases passed after configuration corrections.

## Next Step
Review code quality and LLD compliance.
