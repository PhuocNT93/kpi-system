# Frontend User Guide - Render Cold Start Mitigation

This guide covers only the frontend behavior added by the `render-cold-start-mitigation` task.

## Prerequisites

- Node.js 22
- Backend reachable at the URL configured in `VITE_API_BASE_URL` (defaults to `http://localhost:3000`)

## Startup and shutdown

```powershell
cd frontend
npm ci
npm run dev
```

Stop the dev server with `Ctrl+C`.

Other commands:

```powershell
npm test
npm run typecheck
npm run build
```

## Configured URLs

| Value | Source | Default |
|---|---|---|
| API base URL | `VITE_API_BASE_URL` environment variable read at build time | `http://localhost:3000` |
| Develop API base URL | GitHub Environment `develop` secret `DEVELOP_API_BASE_URL` | not stored in the repository |

## Expected validation behavior

- The first API call of a browser session waits up to 90 seconds before giving up, because a suspended free-tier backend needs time to start.
- Every following call waits up to 20 seconds.
- A failed `GET` is retried up to two more times with increasing backoff.
- `POST`, `PUT`, `PATCH`, and `DELETE` are never retried automatically, so a slow start cannot create duplicate records. The user can retry a write manually from the screen.
- Business errors such as `422` and authentication errors such as `401` are not retried; the existing sign-in redirect on `401` is unchanged.

## Available user-visible behavior

- When the backend does not answer in time, the shared error alert shows: "The server is starting up after a period of inactivity. Please wait a moment and try again."
- The alert keeps its Retry button, so the user can re-run the failed query once the backend is awake.
- All other errors keep the previous message coming from the API response envelope.

## Configurable values

The timeout and retry settings are constants at the top of `frontend/src/shared/api/api-client.ts`:

| Constant | Meaning | Value |
|---|---|---|
| `COLD_START_TIMEOUT_MS` | Timeout before the first successful contact with the server | 90000 |
| `REQUEST_TIMEOUT_MS` | Timeout for later requests | 20000 |
| `MAX_RETRIES` | Extra attempts for `GET` requests | 2 |
| `RETRY_BACKOFF_MS` | Base backoff between retries | 400 |

## Known limitations

- The keep-alive workflow only runs Monday to Friday during working hours, so the first request outside that window can still hit a cold start; the alert message explains the wait.
- Scheduled GitHub workflows can be delayed or disabled after long repository inactivity, so cold starts cannot be ruled out entirely.
- The retry policy cannot recover a write request; the user must trigger it again.
