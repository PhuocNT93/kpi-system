# Step 4: Plan

Status: reconstructed from earlier approved response

## Deliverable
1. **What:** Verify Google ID tokens with Google-supported tooling.
   **Where:** Backend auth configuration and service.
   **Why:** Enforce verified identity, audience, and Workspace domain.
   **Tests:** Backend type and focused auth validation.
2. **What:** Link accounts to active employees and Google subjects.
   **Where:** Migration and user repository.
   **Why:** Prevent ungoverned registration and duplicate identities.
   **Tests:** Migration and repository validation.
3. **What:** Add Google login API and UI action.
   **Where:** Auth route/controller/service and login page/API client/context.
   **Why:** Issue the current application session only after backend verification.
   **Tests:** Type checks and existing auth regression tests.

## Next Step
Implement against the approved test cases.