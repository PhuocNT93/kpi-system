# Step 9: Performance Review

Status: produced during this step

## Deliverable
### Performance Assessment

| Area | Assessment | Notes |
|---|---|---|
| Google ID-token verification | Acceptable | `google-auth-library` owns Google certificate retrieval and caching; verification occurs only at sign-in. |
| Account and employee lookup | Low risk | Sign-in calls normalized `LOWER(email)` lookups. Current unique indexes on raw email may not support these expressions; add functional `LOWER(email)` indexes if production query plans show sequential scans. |
| Actor claims | Acceptable | Role, permission, and managed-team queries occur at login/refresh, not on every protected request. The expected concurrency is low. |
| Identity linking | Acceptable | Unique constraints serialize concurrent first-use registrations and safely reject conflicts. |
| Frontend loading | Acceptable | Google Identity Services is asynchronously loaded; the UI waits before opening the provider prompt. |

### Findings
- No release-blocking performance defects.
- Follow-up: assess `EXPLAIN ANALYZE` against the production database and add functional indexes for `LOWER(app_user.email)` and `LOWER(employee.email)` if needed. This is intentionally deferred because the configured email normalization policy and database data are not available locally.

## Inputs Reviewed
- Google verifier, auth profile resolver, account repository queries, migration, and login UI.

## Actions and Evidence
- Static review of all database calls on the Google sign-in path.
- No production database was configured, so no query plan or benchmark was run.

## Changes Made
- None.

## Decisions and Rationale
- The current path is acceptable for the LLD assumption of 2,000-5,000 employees and approximately 50 peak concurrent users.

## Risks / Blockers
- Query-plan validation remains unavailable without a configured PostgreSQL environment.

## Next Step
- Perform final verification.