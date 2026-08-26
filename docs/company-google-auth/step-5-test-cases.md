# Step 5: Define Test Cases

Status: reconstructed from earlier approved response

## Deliverable
| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | First Google sign-in | Active matching employee | Submit a valid Google token | Linked account and application JWTs are created. |
| TC02 | Returning sign-in | Linked account | Submit valid Google token | Existing account receives JWTs. |
| TC03 | Password account link | Matching password account | Submit valid Google token | Identity links without changing password. |
| TC04 | Unprovisioned account | No matching employee | Submit valid Google token | Generic denial and no account creation. |
| TC05 | Inactive employee | Inactive matching employee | Submit valid Google token | Denial and no JWT. |
| TC06 | Wrong domain | External Google identity | Submit token | Denial and no account creation. |
| TC07 | Unverified identity | `email_verified` false | Submit token | Denial and no JWT. |
| TC08 | Invalid token | Invalid Google token | Submit token | Denial and no token details exposed. |
| TC09 | Identity conflict | Subject already linked | Submit conflicting token | Conflict without duplicate link. |
| TC10 | Legacy login | Password account | Login and refresh | Existing flow remains functional. |

## Next Step
Implement and validate the approved flow.