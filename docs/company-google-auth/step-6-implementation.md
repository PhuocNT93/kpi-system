# Step 6: Implement

Status: produced during this step; revised after approved Step 8 findings

## Deliverable
Implemented company Google Workspace sign-in and first-use account activation for active pre-provisioned employees.

## Inputs Reviewed
- Approved Steps 0-5.
- LLD security requirements and backend/frontend coding rules.

## Actions and Evidence
- Installed `google-auth-library` in backend.
- Backend type check: `npm run typecheck` passed.
- Frontend type check: `npm run typecheck` passed.
- Backend focused auth suite: `npm test -- --run test/auth.module.test.ts` passed (17 tests).

## Changes Made
- Added Google ID-token verifier enforcing client audience, verified email, hosted domain, and company email suffix.
- Added `POST /api/auth/google` and application JWT issue after verified employee lookup.
- Added migration `1724500000004_add_google_workspace_identity.ts` for nullable password-only support and unique employee/Google subject links.
- Added browser Google Identity Services script and company Google sign-in control.
- Added frontend API and `AuthContext` integration using `id_token`.
- Added complete actor-claim resolution for employee ID, IAM role, permissions, and managed-team scope; refresh now resolves the current actor profile.
- First Google activation receives the existing IAM `EMPLOYEE` role only when no IAM role is already assigned. Elevated roles remain administrator-managed.
- Removed `google_subject` from all client-facing user responses.
- Made the login page wait for Google Identity Services to load instead of treating an early click as a configuration error.
- Added frontend and backend example Google client/domain configuration.
- Added API tests for first active-employee Google activation and an unprovisioned-company-identity denial.
- Mapped PostgreSQL unique-constraint races for a duplicate Google subject to the safe `GOOGLE_IDENTITY_CONFLICT` response.
- Marked the account-linking migration explicitly irreversible because restoring a required password hash would invalidate Google-only accounts.

## Decisions and Rationale
- Google identity must match an active, already-provisioned employee; it never creates employee records.
- The backend, rather than the client, verifies Google identity claims before issuing application JWTs.
- Manager scope is derived from the active employees that list the signed-in employee as their manager; no unsupported `team.manager_id` column is assumed.

## Risks / Blockers
- Google Cloud OAuth client configuration and environment variables are required to run the flow.
- Frontend dependency installation reported audit findings and a Node engine warning from an existing test dependency; this did not block type checking.
- Provider-claim rejection cases require an isolated mocked `GoogleIdTokenVerifier` test; API coverage currently injects verified identity outcomes.
- The irreversible migration must be deployed only after confirming the production backup and rollback strategy.

## Next Step
Run the approved focused tests and report results.