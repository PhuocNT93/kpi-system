# Step 5: Define Test Cases

Status: reconstructed

## Deliverable

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Create valid department | Actor is authorized admin | POST `/api/v1/departments` with valid unique code | `201 Created`, returns department data in standard API envelope. |
| TC02 | Create department with duplicate code | Department with `code='ENG'` exists | POST `/api/v1/departments` with `code='ENG'` | `409 Conflict` (or `422`), error code in `meta.error.code`. |
| TC03 | Get department list | Departments exist | GET `/api/v1/departments` | `200 OK`, paginated list of departments in `data` array. |
| TC04 | Create valid Job Role | Actor is authorized admin | POST `/api/v1/roles` with valid data | `201 Created`, standard envelope. |
| TC05 | Create Job Role with duplicate code | Role with `code='SE'` exists | POST `/api/v1/roles` with `code='SE'` | `409 Conflict`, standard envelope. |
| TC06 | Create valid Job Level | Actor is authorized admin | POST `/api/v1/job-levels` with valid data | `201 Created`, standard envelope. |
| TC07 | Unauthorized access | Actor is missing correct RBAC scope | POST `/api/v1/departments` | `403 Forbidden`, standard envelope. |
| TC08 | Validation failure | Request body missing required fields (`name`, `code`) | POST `/api/v1/departments` with empty payload | `400 Bad Request`, Zod validation errors in `meta.error.details`. |
