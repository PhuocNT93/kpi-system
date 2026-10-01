# Step 7: Test Results

## Automated & Verification Test Runs

| Check | Command | Result | Notes |
|---|---|---|---|
| Unit | `npm --prefix backend test -- src/modules/crawl-job/domain/crawl-job.schemas.test.ts src/modules/crawl-job/domain/crawl-job.types.test.ts` | **PASS** | 2 test suites passed, 6/6 tests passing (schemas & types) |
| Integration | `docker exec kpi-system-backend-1 node /app/dist/modules/crawl-job/infrastructure/seed-crawl-job-samples.js` | **PASS** | Script version immutability bypass, draft transition, hash verification, and DB seeding passed |
| Database Regression | `docker exec kpi-system-postgres-1 psql -U kpi_app -d kpi_system -c "SELECT source_code ..."` | **PASS** | Verified live script in DB has bug count normalized (`1.0`) and criteria filtering (`shouldInclude`) |
| Type Check (Backend) | `npm --prefix backend run typecheck` (`tsc --noEmit`) | **PASS** | 0 type errors |
| Type Check (Frontend) | `npm --prefix frontend run typecheck` (`tsc -p tsconfig.app.json && tsc -p tsconfig.node.json`) | **PASS** | 0 type errors |
| Lint (Backend) | `npm --prefix backend run lint` (`eslint .`) | **PASS** | 0 errors |
| Lint (Frontend) | `npm --prefix frontend run lint` (`eslint .`) | **PASS** | 0 errors |
| Build (Frontend) | `npm --prefix frontend run build` (`vite build`) | **PASS** | Production bundle built cleanly in 29.75s |
| Build (Backend) | `npm --prefix backend run build` (`tsc -p tsconfig.json`) | **PASS** | Backend dist compiled cleanly |

## Failures / Blockers
None.
