# Step 1: Understand

Status: reconstructed from approved response

## Deliverable

## Task Understanding

### Goal
Implement the end-to-end **Email Notification (SMTP)** feature using **Google Workspace SMTP relay** for the Employee Performance Evaluation Management System. The solution ensures reliable, decoupled email delivery via the **Transactional Outbox Pattern**, integrates 9 lifecycle events, provides multilingual email templates (reusing `i18n_translation`), supports user notification preferences, supplies administrative management/resend capabilities, enforces strict security/PII guidelines, and runs an automated 1-year log retention purge job.

### Expected Behavior

1. **Transactional Outbox Mechanics**:
   - When a business operation occurs (e.g., Cycle opened, Self evaluation submitted, Result published), a pending notification record (`notification_log` with `status='PENDING'`) is written atomically within the same database transaction.
   - If the business transaction commits, the notification log is persisted; if the transaction aborts/rolls back, the notification log rolls back as well (no orphaned notifications).
   - An asynchronous worker processes pending outbox entries, checks recipient preferences, renders template content based on recipient locale (with English fallback), and dispatches emails via Nodemailer using Google Workspace SMTP relay outside the database transaction.
   - Failures in email dispatch or SMTP outages do **not** fail the business transaction.
   - Failed emails retry up to 3 times using exponential backoff before being marked as `FAILED` for administrative review/resend.
   - The worker throttles dispatch (configurable via `SMTP_THROTTLE_PER_MINUTE`) to prevent spiking and respect Google SMTP relay rate limits.

2. **Lifecycle Events (9 Events)**:
   - `CYCLE_OPENED`: Emitted when an evaluation cycle opens -> sent to participating Employees.
   - `SELF_SUBMITTED`: Emitted on self-evaluation submission -> sent to respective Manager.
   - `MANAGER_SUBMITTED`: Emitted on manager evaluation submission -> sent to Reviewer/HR.
   - `CORRECTION_REQUESTED`: Emitted on evaluation correction request -> sent to Manager.
   - `RESULT_PUBLISHED`: Emitted on final approval and publication -> sent to Employee (mandatory; cannot be disabled).
   - `SCORE_ADJUSTED`: Emitted on calibration adjustments post-publish -> sent to Employee.
   - `REVIEW_DUE_REMINDER`: Emitted on scheduled due date check -> sent to HR/Manager (never to Employee).
   - `IMPORT_COMPLETED`: Emitted when bulk CSV import finishes -> sent to the executing HR/Admin.
   - `CYCLE_LOCKED`: Emitted on evaluation cycle lock -> sent to cycle creator HR/Admin.

3. **Template & Multilingual Rendering**:
   - 9 initial `notification_template` records seeded in database.
   - Translations for `subject` and `body_html` stored in `i18n_translation` (`entity_type='NOTIFICATION_TEMPLATE'`) for both `en` and `vi`.
   - Email recipient's preferred locale (`user_account.locale`) determines rendered language; falls back to `en` if translation is missing.
   - **Zero PII Leakage**: Emails contain only summary metadata and secure portal deep links (requiring re-authentication via Google SSO); no scores, comments, or private evaluation evidence are embedded.

4. **Preferences & Administration API**:
   - `GET /users/me/notification-preferences`: Current user retrieves preferences.
   - `PATCH /users/me/notification-preferences`: Current user toggles preferences per event type, strictly blocked from disabling `RESULT_PUBLISHED` (`422 MANDATORY_NOTIFICATION_TYPE`).
   - `GET /notification-templates` & `PUT /notification-templates`: HR/Admin reads and updates template configurations and translations (audited in `audit_log`).
   - `GET /admin/notifications`: HR/Admin and System Admin search and filter notification history (`status`, `notification_type`, date range).
   - `POST /admin/notifications/{id}/resend`: HR/Admin and System Admin trigger manual resend for failed/stuck notifications.

5. **Retention & Housekeeping**:
   - Automated background job purges `notification_log` entries older than 1 year (Rule 19).
   - Kept completely separate from `audit_log` retention (notification logs are operational logs and hard-purged, whereas audit logs require permanent cold-storage).

6. **Frontend Experience**:
   - **Notification Preferences Screen** (All users): Toggle notification types; `RESULT_PUBLISHED` toggle is permanently disabled with an explanatory tooltip.
   - **Notification Templates Management** (HR/Admin): Edit template subject and body with multi-tab locale switching (`en`/`vi`), reusing existing i18n UI patterns.
   - **Notification Log & Delivery History** (HR/Admin, System Admin): Table view of logs with filters, delivery status badges, error details, and manual resend action.

### Acceptance Criteria

1. Database Schema & Migrations: Tables `notification_template`, `notification_log`, and `user_notification_preference` created matching LLD section 21.2.3. Seed 9 templates with `en` and `vi` translations.
2. Transactional Outbox & Atomicity: Business write and pending outbox entry commit atomically. Rollback leaves 0 orphaned outbox rows. SMTP failure does not fail business write.
3. Queue, Worker & Google SMTP Relay: Nodemailer configured with Google Workspace SMTP relay. Asynchronous worker polls outbox, checks preferences, respects throttle, and retries up to 3 times before setting `FAILED`.
4. Event Integration: 9 lifecycle events trigger pending outbox rows with accurate recipients. Review due reminders send to HR/Manager, not employees.
5. Business Rules & Security: Rule 15 (outbox decoupled from SMTP), Rule 16 (no scores/PII), Rule 17 (mandatory `RESULT_PUBLISHED` returns 422 on disable), Rule 18 (max 3 retries), Rule 19 (1-year log retention purge).
6. RBAC & Error Formats: 403 Forbidden on admin endpoints for unauthorized users. Standard JSON envelope responses.
7. Frontend Implementation: 3 screens with loading, empty, error, and permission states. Disabled mandatory toggle with tooltip.

### Out of Scope
- Weekly/monthly digest emails, SMS, and push notifications (deferred to Phase 2).
- Rich interactive HTML visual builders/WYSIWYG email designers.
- Changes to existing evaluation, calibration, or workflow state transition logic.
- Custom i18n mechanisms outside the established `i18n_translation` architecture.

### Business Rules Involved
- Rule 15 (Outbox Decoupling)
- Rule 16 (PII & Data Leakage Protection)
- Rule 17 (Mandatory Notifications)
- Rule 18 (Fault Tolerance & Retry)
- Rule 19 (Log Retention Lifecycle)

### Open Questions / Conflicts
- None.

## Inputs Reviewed
- User feature prompt.
- LLD v1.7 Sections 2, 5, 7, 8, 10.8, 10.10, 14.1, 15, 18, 21, 21.1, 21.2, 27, 28, 29, 30.

## Actions and Evidence
- Reviewed business domain, modules, outbox pattern, and security requirements.
- Confirmed user preference to use Google SMTP relay.

## Changes Made
- Documented feature scope and acceptance criteria.

## Decisions and Rationale
- Adopted Transactional Outbox Pattern to guarantee no lost email events and prevent SMTP errors from impacting business transactions.
- Reused `i18n_translation` for multilingual email templates.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate.
