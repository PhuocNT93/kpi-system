# Step 5: Test Cases

- `/health/db` returns 200 OK.
- `api-client.ts` retries correctly and throws `SERVER_WAKING_UP` when max retries hit.
- `ErrorAlert` displays proper UX for waking up.
- `npm run lint` passes 100% on both ends.
- All existing tests pass.
