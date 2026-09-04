# Step 3: Impact Analysis

- **Backend**: `/health/db` endpoint addition is safe.
- **Frontend**: API Client retry logic affects all `GET` calls. Needs careful testing.
- **CI**: Adding `npm run lint` will block merge if not clean.
- **Types**: Removing `any` might reveal logic bugs, requiring careful narrowing.
