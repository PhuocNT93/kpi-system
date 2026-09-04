# Step 2: Investigate

- Backend health endpoint (`/health`) needs DB connection check (`SELECT 1`).
- GitHub Actions cron can hit `/health` every 12 mins.
- API Client in frontend (`api-client.ts`) needs exponential backoff for `GET` requests on 502/503/Timeout.
- Lint debt: hundreds of `any` and `eslint-disable` in frontend and backend.
