# Step 7: Test Results

Status: produced during this step

## Test Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Staging Compose | `docker compose --env-file .env.staging.example -f docker-compose.staging.yml config --quiet` | PASS | Staging interpolation and service configuration are valid. |
| Workflow lint | `Get-Content -Raw .github/workflows/staging.yml \| docker run --rm -i rhysd/actionlint:latest -` | PASS | Completed without diagnostics. |
| Backend CI | `npm ci; npm test; npm run typecheck; npm run build` | PASS | 32 tests passed; 1 isolated migration test skipped; typecheck/build passed. |
| Frontend CI | `npm ci; npm test; npm run typecheck; npm run build` | PASS | 2 tests passed; typecheck/build passed. |
| Diff | `git diff --check` | PASS | No whitespace errors. |
| Staging SSH deployment | GitHub Actions deploy job | NOT APPLICABLE | Requires external staging host and configured GitHub environment secrets. |
| Provider configuration | Render/Vercel configuration inspection | PASS | Render migration command and Vercel Vite output settings are present. |
| Provider deployment | Vercel/Render APIs | NOT APPLICABLE | Requires configured provider projects, tokens, deploy hook, and Neon URL. |

Failures / Blockers:
- The previous GHCR/SSH deployment was replaced; provider deployment was not executed locally because no provider projects or GitHub secrets are available.
- `npm ci` reported dependency audit findings in backend and frontend packages; no dependency upgrades were made in this scope.

## Inputs Reviewed
- `.github/workflows/staging.yml`
- `docker-compose.staging.yml`
- `.env.staging.example`
- `backend/package.json`
- `frontend/package.json`

## Actions and Evidence
- Validation commands above were executed after implementation.

## Changes Made
- None.

## Decisions and Rationale
- Local checks validate the workflow’s static and build behavior; deployment remains environment-dependent.

## Risks / Blockers
- GHCR permissions, SSH host-key configuration, and staging secrets must be configured before the first real deployment.

## Next Step
Review the staging CI/CD implementation for correctness and security.