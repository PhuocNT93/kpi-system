# Step 5: Define Test Cases

Status: reconstructed from approved response

## Deliverable

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| **TC01** | Database Migration & Schema Validation | Database initialized | Run `migrate:up` for notification tables | Tables `notification_template`, `notification_log`, `user_notification_preference` created with correct columns, types, foreign keys, and compound index `(status, created_at)`. |
| **TC02** | Default Template & i18n Seeding | Database migrated | Execute notification seed script | 9 default notification templates created; corresponding `subject` and `body_html` entries created in `i18n_translation` for both `en` (default) and `vi`. |
| **TC03** | Rule 15: Atomic Business & Outbox Commit | Valid evaluation cycle / evaluation in database | Trigger business action (e.g., Publish evaluation) within transaction | Both the evaluation update (`status='PUBLISHED'`) and outbox insertion (`notification_log` with `status='PENDING'`) commit atomically in the database. |
| **TC04** | Rule 15: Outbox Rollback on Business Failure | Valid evaluation in database | Simulate business failure during operation (e.g., DB constraint violation or deliberate error inside transaction) | Transaction aborts; evaluation remains unchanged AND 0 outbox records are created in `notification_log` (no orphaned notifications). |
| **TC05** | Rule 15: Asynchronous SMTP Failure Isolation | Outbox record `PENDING`; mock SMTP transport configured to throw connection error | Outbox worker processes pending item | Business action remains completely unaffected and committed; notification log records `retry_count = 1`, saves error message, and retains retry status outside business transaction. |
| **TC06** | Rule 18: Max 3 Retries Exponential Backoff | Outbox record in `PENDING` state; SMTP server persistently unreachable | Worker runs 4 consecutive polling ticks | Worker retries on ticks 1, 2, and 3 with increasing backoff delays; on the 4th tick after 3 failures, status transitions to `FAILED` and worker halts further automatic retries. |
| **TC07** | SMTP Dispatch Throttling (Risk #15) | 100 pending notifications created (simulating cycle opening burst); throttle configured to 60/min | Worker processes the pending batch for 1 minute | Worker dispatches at most 60 emails in the 60-second window, deferring the remaining 40 to the next minute to respect Google Workspace SMTP relay rate limits. |
| **TC08** | Rule 17: Prevent Disabling Mandatory Notification Type | Authenticated user (`EMPLOYEE`) | `PATCH /users/me/notification-preferences` with `{ "preferences": [{ "notification_type": "RESULT_PUBLISHED", "enabled": false }] }` | Request rejected with HTTP `422 Unprocessable` and error code `MANDATORY_NOTIFICATION_TYPE`. Preference remains enabled. |
| **TC09** | User Notification Preferences Toggle (Happy Path) | Authenticated user with default preferences | `PATCH /users/me/notification-preferences` with `{ "preferences": [{ "notification_type": "SELF_SUBMITTED", "enabled": false }] }` | Returns HTTP `200 OK`; subsequent notification for `SELF_SUBMITTED` results in log status `SKIPPED` without sending email. |
| **TC10** | Rule 16: Zero PII & Score Leakage in Email Body | Evaluation published with `final_score = 95.5`, evaluator comments, and evidence | Outbox worker renders email for `RESULT_PUBLISHED` | Rendered subject and body contain milestone announcement, recipient name, cycle name, and portal deep link; snapshot assertion confirms zero occurrence of scores, ratings, or comments. |
| **TC11** | i18n Rendering: Recipient Vietnamese Locale | Recipient user has `app_user.locale = 'vi'`; template translations exist for both `en` and `vi` | Outbox worker renders notification | Email rendered using Vietnamese (`vi`) copy from `i18n_translation`; `notification_log.locale_used` recorded as `'vi'`. |
| **TC12** | i18n Fallback: Missing Locale Translation | Recipient user has `app_user.locale = 'vi'`; `vi` translation row is absent or empty in `i18n_translation` | Outbox worker renders notification | Renderer gracefully falls back to baseline English (`en`); email dispatches successfully with `notification_log.locale_used = 'en'`. |
| **TC13** | i18n Default: No Locale Specified | Recipient user has `app_user.locale = null` or unsupported locale | Outbox worker renders notification | Renderer defaults directly to English (`en`); `notification_log.locale_used` recorded as `'en'`. |
| **TC14** | RBAC Negative: Non-Admin Access Forbidden | Authenticated user with `role = 'EMPLOYEE'` or `'MANAGER'` | `GET /admin/notifications` or `GET /notification-templates` | Request rejected with HTTP `403 Forbidden`. |
| **TC15** | Admin Manual Resend | Notification log with `status = 'FAILED'` exists in database; authenticated as `HR_ADMIN` | `POST /admin/notifications/:id/resend` | Returns HTTP `200 OK`; notification log status reset to `PENDING`, `retry_count` reset to 0, and item re-enqueued for worker pickup. |
| **TC16** | Notification Template Audit Logging | Authenticated as `HR_ADMIN` | `PUT /notification-templates/:id` updating template active status or translations | Template updated; an `audit_log` entry is persisted via `AuditService` with action `UPDATE` and actor ID. No audit entry created for regular outbox delivery. |
| **TC17** | Rule 19: 1-Year Retention Log Purge | Database contains notification logs created 400 days ago, 30 days ago, and `audit_log` entries from 400 days ago | Run `NotificationRetentionService.purgeExpiredLogs()` | All `notification_log` entries older than 365 days are deleted in batches; logs younger than 365 days remain intact; all `audit_log` records remain untouched. |
| **TC18** | Event Integration: Review Due Reminder | Scheduled check detects employees approaching review due date | Due reminder trigger runs | Generates outbox record for HR and respective Manager; confirms recipient is NEVER the Employee being evaluated. |
| **TC19** | Frontend: Preferences Page Mandatory Lock | User navigates to Notification Preferences screen | Inspect toggle list on UI | Toggle for `RESULT_PUBLISHED` is rendered permanently disabled/locked with a tooltip explaining that result publication notices are mandatory. |
| **TC20** | Frontend: Multi-Language Template Management | HR Admin navigates to Notification Templates screen | Switch tabs between `English (Baseline)` and `Vietnamese`, edit subject/body, and click Save | Form validates that English baseline fields are non-empty; saves localized translations to backend; shows success notification toast. |
| **TC21** | Frontend: Notification Log Filters & Resend | HR Admin navigates to Notification Delivery Log screen | Filter by `status='FAILED'`, inspect error message modal, and click "Resend" button | Table filters to failed items; clicking resend sends API call and optimistically updates status badge to "Pending". |
| **TC22** | Frontend: Permission-Gated Navigation | Logged in as `EMPLOYEE` | Attempt direct URL navigation to `/admin/notifications` | User is redirected or presented with standard 403 Forbidden access gate. |

## Inputs Reviewed
- Implementation Plan (Step 4), Definition of Done, LLD 21.2, Rules 15, 16, 17, 18, 19.

## Actions and Evidence
- Mapped acceptance criteria and edge cases to 22 comprehensive test cases.

## Changes Made
- Authored test case table TC01 to TC22.

## Decisions and Rationale
- Covered database, transaction atomicity, worker throttling, exponential retry, security/PII protection, i18n fallback, RBAC, and frontend UI states.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implement.
