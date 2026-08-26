# Step 3: Impact Analysis

Status: reconstructed from earlier approved response

## Deliverable
| Area | Impact | Notes |
|---|---|---|
| Frontend | MEDIUM | Google sign-in action and Google Identity Services integration. |
| Backend | HIGH | Server-side signed Google ID-token verification and JWT issue. |
| Database | MEDIUM | Account-to-employee and Google subject relationship. |
| API | MEDIUM | Google login endpoint. |
| RBAC / Scope | HIGH | Resolve internal role before issuing a token. |
| Workflow | NONE | Evaluation lifecycle unchanged. |
| Audit | LOW | No token material is persisted. |
| Concurrency | LOW | Unique employee and Google subject constraints prevent duplicates. |
| Performance | LOW | Token validation is only at sign-in. |
| Historical Data | NONE | Evaluation data is unchanged. |

Potential Risks:
- The ID token must be signature/audience/issuer/expiry verified; an email-domain check alone is insufficient.
- No arbitrary employee record may be created from Google identity.

Required ADR / Clarification:
- None.

## Next Step
Implement verified company identity login and account linking.