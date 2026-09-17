# Step 4: Plan

Status: reconstructed from approved response

## Deliverable

## Implementation Plan

1. **What:** Install `nodemailer` and `@types/nodemailer` dependencies.  
   **Where:** `backend/package.json`.  
   **Why:** Required for Google Workspace SMTP relay email transport via Nodemailer.  
   **Tests:** `npm run typecheck`, `npm test`.

2. **What:** Create database migration for notification tables and compound indexes.  
   **Where:** `backend/migrations/1788926000018_create_notification_tables.ts`.  
   **Why:** Establishes the database schema for `notification_template`, `notification_log` (outbox), and `user_notification_preference` per LLD Section 21.2.3, including index `(status, created_at)` for outbox polling.  
   **Tests:** Migration up and down tests in `backend/test/` and `npm run migrate:up:tsx`.

3. **What:** Seed default notification templates and multi-language translations (`en` default baseline, `vi`).  
   **Where:** `backend/src/modules/notification/infrastructure/seed/notification.seed.ts`.  
   **Why:** Pre-populates the 9 core lifecycle templates and their English/Vietnamese `subject` and `body_html` in `i18n_translation` (`entity_type='NOTIFICATION_TEMPLATE'`).  
   **Tests:** Seeding script execution and repository query tests.

4. **What:** Create Notification domain models, error codes, and Zod schemas.  
   **Where:** `backend/src/modules/notification/domain/notification.types.ts` and `backend/src/modules/notification/api/notification.dto.ts`.  
   **Why:** Enforces strong typing for 9 notification types, statuses (`PENDING`, `SENT`, `FAILED`, `SKIPPED`), preference payloads, log query filters, and Rule 17 validation schema.  
   **Tests:** Schema validation unit tests.

5. **What:** Implement Notification repository for PostgreSQL.  
   **Where:** `backend/src/modules/notification/domain/notification.repository.ts` and `backend/src/modules/notification/infrastructure/postgres-notification.repository.ts`.  
   **Why:** Provides atomic outbox row insertion with `TransactionClient`, row-locked polling (`FOR UPDATE SKIP LOCKED`), status updates, preference retrieval/upsert, log pagination, and batch purge queries.  
   **Tests:** Repository integration tests verifying transactional queries and batch operations.

6. **What:** Implement Multi-Language Template Renderer enforcing Rule 16 (No PII / scores / comments).  
   **Where:** `backend/src/modules/notification/application/template-renderer.service.ts`.  
   **Why:** Resolves localized email template via `I18nService` according to recipient locale with fallback to `en`, replaces context tokens (`{{employee_name}}`, `{{cycle_name}}`, `{{link}}`), and ensures zero score or confidential evidence leakage.  
   **Tests:** Unit tests verifying `en` fallback, variable substitution, and asserting absence of PII/score fields.

7. **What:** Implement Google Workspace SMTP Transport service.  
   **Where:** `backend/src/modules/notification/application/smtp-sender.service.ts`.  
   **Why:** Manages Nodemailer SMTP client configured via environment variables (`SMTP_HOST=smtp-relay.gmail.com`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`/token, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`).  
   **Tests:** Mock SMTP transport tests verifying error propagation and payload formatting.

8. **What:** Implement Asynchronous Outbox Worker with dispatch throttling and exponential backoff retry.  
   **Where:** `backend/src/modules/notification/application/outbox-worker.service.ts`.  
   **Why:** Polling worker reads `PENDING` outbox entries, checks user preferences, throttles dispatch rate per `SMTP_THROTTLE_PER_MINUTE`, sends via SMTP, updates status to `SENT`, and enforces Rule 18 (retries up to 3 times with exponential backoff before marking as `FAILED`).  
   **Tests:** Worker lifecycle tests, throttling rate tests, and 3-attempt retry cutoff tests.

9. **What:** Implement Notification Retention Purge Service.  
   **Where:** `backend/src/modules/notification/application/notification-retention.service.ts`.  
   **Why:** Implements Rule 19 by batch-purging `notification_log` records older than 365 days without touching `audit_log`.  
   **Tests:** Batch deletion unit/integration test verifying cutoff calculation and batching.

10. **What:** Implement Notification Application Service.  
    **Where:** `backend/src/modules/notification/application/notification.service.ts`.  
    **Why:** Coordinates outbox enqueuing within business transactions (Rule 15), preference queries/updates (Rule 17 rejection with HTTP 422), template management with `AuditService` recording, log filtering, and manual admin resend.  
    **Tests:** Unit tests for preference validation, audit recording, and resend trigger.

11. **What:** Implement Notification API Controller, Routes, and wire into Application.  
    **Where:** `backend/src/modules/notification/api/notification.controller.ts`, `backend/src/modules/notification/api/notification.routes.ts`, `backend/src/modules/notification/notification.module.ts`, and `backend/src/app.ts`.  
    **Why:** Exposes REST endpoints (`GET/PATCH /users/me/notification-preferences`, `GET/PUT /notification-templates`, `GET /admin/notifications`, `POST /admin/notifications/:id/resend`) with JWT auth and RBAC guards.  
    **Tests:** Controller integration tests and negative RBAC permission tests (Employee calling admin routes -> 403).

12. **What:** Integrate Notification Outbox triggers into the 9 business events.  
    **Where:**  
    - `CYCLE_OPENED`: `backend/src/modules/evaluation-cycle/application/evaluation-cycle-opening.service.ts`  
    - `SELF_SUBMITTED`: `backend/src/modules/evaluation/application/services/evaluation.service.ts` (`submitSelfEvaluation`)  
    - `MANAGER_SUBMITTED`: `backend/src/modules/evaluation/application/services/evaluation.service.ts` (`submitManagerEvaluation`)  
    - `CORRECTION_REQUESTED`: `backend/src/modules/evaluation/application/services/evaluation.service.ts` (`requestCorrection`)  
    - `RESULT_PUBLISHED`: `backend/src/modules/evaluation/application/services/evaluation.service.ts` (`publishEvaluation`)  
    - `SCORE_ADJUSTED`: `backend/src/modules/calibration/application/calibration.service.ts` (`adjustScore`)  
    - `REVIEW_DUE_REMINDER`: Scheduled due reminder service / evaluation trigger  
    - `IMPORT_COMPLETED`: `backend/src/modules/import/application/csv-import.service.ts`  
    - `CYCLE_LOCKED`: `backend/src/modules/evaluation-cycle/application/evaluation-cycle.service.ts` (`lockCycle`)  
    **Why:** Ensures outbox insertion is atomic with business writes (Rule 15), so transaction rollback discards the outbox record, and SMTP failures never block business execution.  
    **Tests:** Integration tests verifying business commit/rollback atomicity and outbox generation.

13. **What:** Implement Frontend Typed API Client for Notifications.  
    **Where:** `frontend/src/features/notifications/api/notification-api.ts`.  
    **Why:** Provides typed fetch methods for preferences, templates, logs, and resend operations.  
    **Tests:** Frontend API client unit tests.

14. **What:** Implement Frontend Notification Preferences Page.  
    **Where:** `frontend/src/features/notifications/pages/NotificationPreferencesPage.tsx`.  
    **Why:** Allows every user to view and toggle notification preferences; keeps `RESULT_PUBLISHED` permanently disabled with an explanatory tooltip (Rule 17).  
    **Tests:** Component test verifying toggle interaction and disabled tooltip state.

15. **What:** Implement Frontend Notification Templates Management Page.  
    **Where:** `frontend/src/features/notifications/pages/NotificationTemplatesPage.tsx`.  
    **Why:** Allows HR/Admin to edit email subjects and bodies with multi-language tabs (`en` default baseline, `vi`), preview placeholders, and save translations.  
    **Tests:** Component test verifying tab switching, validation, and update calls.

16. **What:** Implement Frontend Notification Log & Resend Page.  
    **Where:** `frontend/src/features/notifications/pages/NotificationLogPage.tsx`.  
    **Why:** Allows HR/Admin and System Admin to browse notification logs, filter by status/type/date, inspect error messages, and trigger manual resends.  
    **Tests:** Component test for table filters, pagination, and resend action.

17. **What:** Register Notification routes and navigation in Frontend App Shell.  
    **Where:** `frontend/src/App.tsx`.  
    **Why:** Adds navigation items under user settings and admin navigation with role-based routing.  
    **Tests:** Navigation and protected route integration tests.

## Inputs Reviewed
- Steps 1-3 deliverables, LLD v1.7 Section 21.2, project module boundaries.

## Actions and Evidence
- Structured plan into 17 sequenced work items covering backend, frontend, database, integration, and verification.

## Changes Made
- Detailed 17-point implementation roadmap.

## Decisions and Rationale
- Sequenced work: Database -> Repository -> Domain/Application -> SMTP/Worker -> API/App wiring -> Integration touchpoints -> Frontend -> Tests.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases.
