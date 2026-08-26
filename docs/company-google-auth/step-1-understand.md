# Step 1: Understand

Status: reconstructed from earlier approved response

## Deliverable
Goal: Allow active company employees to register and sign in through verified Google Workspace identity.

Expected Behavior: A verified `@cyberlogitec.com` Google identity activates or signs into an internal account and receives an application JWT.

Acceptance Criteria:
1. Verified company Google identities can sign in.
2. An eligible, pre-provisioned employee can activate an account on first sign-in.
3. Returning employees can sign in.
4. Non-company and unverified identities are rejected safely.
5. Internal role and scope are resolved before issuing a JWT.

Out of Scope:
- Non-Google identity providers and Google Workspace administration.

Business Rules Involved:
- OAuth2/OIDC is permitted by the LLD; RBAC and scope are server-enforced.

Open Questions / Conflicts:
- None. Approved domain: `cyberlogitec.com`; registration source: active pre-provisioned employee.

## Next Step
Investigate current IAM and employee persistence.