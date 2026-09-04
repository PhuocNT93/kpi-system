# Step 4: Plan

1. **Part A - Cold Start**:
   - `GET /health/db` with `SELECT 1`.
   - `.github/workflows/develop-keepalive.yml` cron.
   - `api-client.ts` retry logic & `SERVER_WAKING_UP` state.
   - `ErrorAlert` component handles `SERVER_WAKING_UP`.

2. **Part B - Lint Debt**:
   - Fix all `eslint` warnings/errors in Backend.
   - Fix all `eslint` warnings/errors in Frontend (replace `any`).
   - Add `npm run lint` to `develop.yml`.
