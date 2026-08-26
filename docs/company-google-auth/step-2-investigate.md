# Step 2: Investigate

Status: reconstructed from earlier approved response

## Deliverable
Relevant Documents:
- LLD security and auth recommendations.
- Backend Node and frontend React rules.

Relevant Modules and Files:
- `backend/src/modules/auth/`, `backend/migrations/1724500000002_create_app_user.ts`, and `frontend/src/features/auth/pages/LoginPage.tsx`.

Existing Implementation:
- Password signup/login issues internal JWTs.
- Employee and application user records were previously unlinked.
- No OIDC library or Google login UI existed.

Existing Tests:
- `backend/test/auth.module.test.ts` covers password auth and token refresh.

Patterns to Reuse:
- `AuthService`, `JWTTokenService`, Express controller/router, typed frontend API client, and `AuthContext`.

## Next Step
Assess impact before modifying IAM persistence and sign-in behavior.