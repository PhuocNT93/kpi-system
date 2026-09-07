# Step 5: Define Test Cases

Status: reconstructed

## Deliverable

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | HR_ADMIN downloads current CSV template | User has `HR_ADMIN` role | `GET /csv-templates/current/download` | 200 OK. Response has `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="employee_evaluation_template_v1.csv"`. CSV contains exact column headers in `display_order`. |
| TC02 | Unauthenticated user attempts download | User is not logged in | `GET /csv-templates/current/download` | 401 Unauthorized. JSON error payload returned. |
| TC03 | Non-admin user attempts download | User has `EMPLOYEE`, `MANAGER`, or `SYSTEM_ADMIN` role | `GET /csv-templates/current/download` | 403 Forbidden. JSON error payload returned. |
| TC04 | Download specific version template by ID | User has `HR_ADMIN` role. Template ID exists. | `GET /csv-templates/{csv_template_id}/download` | 200 OK. Correct historical CSV template is downloaded. |
| TC05 | Download non-existent template ID | User has `HR_ADMIN` role. Template ID is invalid. | `GET /csv-templates/invalid-id/download` | 404 Not Found. Standard JSON error envelope. |
| TC06 | Current template resolution ignores inactive versions | DB has version 1 (ACTIVE), version 2 (DRAFT), version 3 (DEPRECATED) | `GET /csv-templates/current/download` | Returns version 1 (ACTIVE). |
| TC07 | Template column JSONB validation persistence | `import.seed.ts` is executed | Query `csv_template_column` where `column_name = 'comment'` | `validation_rule` contains condition that it is required when `score_override` is supplied. |
