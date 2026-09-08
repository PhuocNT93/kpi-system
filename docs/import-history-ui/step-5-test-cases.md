# Step 5: Define Test Cases

Status: reconstructed

## Deliverable

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | HR_ADMIN views paginated history | User is HR_ADMIN, multiple import jobs exist. | Request `GET /imports?page=1&pageSize=20`. | Returns 200 OK with paginated list of jobs, total count, and standard API envelope. |
| TC02 | Non-HR_ADMIN access denied | User has MANAGER role. | Request `GET /imports`. | Returns 403 Forbidden, no data is leaked. |
| TC03 | View job details and rows | Job ID exists in the database. | Request `GET /imports/:id/rows?page=1`. | Returns 200 OK with paginated import rows and errors. |
| TC04 | View non-existent job | Job ID does not exist. | Request `GET /imports/:id/rows`. | Returns 404 Not Found. |
| TC05 | Frontend history pagination | More than 20 jobs exist, user is on `/imports`. | Click "Next Page" in the history table. | React Query fetches page 2, UI updates without a full page reload. |
| TC06 | Frontend strict mode block | Job has invalid rows, user is in upload/preview flow. | User selects Strict mode and clicks Confirm. | UI warns the user and does not proceed unless confirmed; if the API rejects it, the preview remains visible with the 400 error. |
| TC07 | Frontend empty state | No jobs exist. | User visits `/imports`. | UI renders the empty state component ("No imports yet"). |
| TC08 | Frontend async polling | Job status is IMPORTING. | User is on the upload/preview flow or detail page. | UI polls `GET /imports/:id` every few seconds until status changes to COMPLETED, then polling stops. |
