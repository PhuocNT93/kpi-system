# Step 3: Impact Analysis

Status: reconstructed from approved response

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| **Frontend** | MEDIUM | Introduces 3 new screens with full multi-language (`en` default, `vi` secondary) support: Preferences, Templates (multi-tab editor), Delivery Log. Updates routes and navigation in `frontend/src/App.tsx`. |
| **Backend** | HIGH | Adds `notification` module (`router`, `service`, `repository`, `schemas`, `types`, `outbox-worker`, `template-renderer`, `smtp-sender`, `retention-service`). Injects transactional outbox hooks into business modules. Multi-language template rendering resolves recipient locale with `en` default baseline. |
| **Database** | MEDIUM | Migration for 3 tables: `notification_template`, `notification_log`, and `user_notification_preference`, with index `(status, created_at)`. Seeds 9 templates along with baseline `en` (default) and `vi` translations in `i18n_translation`. |
| **API** | MEDIUM | Introduces 5 REST endpoints (`/users/me/notification-preferences` [GET, PATCH], `/notification-templates` [GET, PUT], `/admin/notifications` [GET], `/admin/notifications/:id/resend` [POST]). Standard JSON envelopes. |
| **RBAC / Scope** | LOW | Self-service preferences open to all authenticated users. Template management and Delivery Log inspection/resend strictly restricted to `HR_ADMIN` and `SYSTEM_ADMIN` (returning 403 Forbidden for unauthorized roles). |
| **Workflow** | LOW | Evaluation and cycle state transitions remain logically unchanged; they merely append an outbox row within their existing database transaction. |
| **Audit** | LOW | Changes to `notification_template` and their i18n translations are recorded in `audit_log` via `auditService.record(tx, ...)`. Per LLD Section 21.2.7, `notification_log` entries do not emit redundant `audit_log` records. |
| **Concurrency** | MEDIUM | Transactional outbox polling employs row-locking (`FOR UPDATE SKIP LOCKED`) to ensure exactly-once processing during concurrent worker runs or manual admin resends. |
| **Performance** | MEDIUM | Worker implements configurable dispatch throttling (`SMTP_THROTTLE_PER_MINUTE`) to smooth traffic spikes and avoid Google Workspace SMTP relay quota throttling. Indexed polling and batched 1-year retention purge prevent database load. |
| **Historical Data** | LOW | No changes or migrations needed for historical evaluation records. Retention job purges only `notification_log` records older than 365 days, completely decoupled from `audit_log`. |

### Multi-Language Architecture Details (Default: `en`)
1. Baseline English (`en`) mandatory for all templates.
2. Recipient locale retrieved from `app_user.locale`, defaulting to `en` if absent or invalid.
3. Resolution sequence: Preferred Locale (e.g. `vi`) -> Fallback Baseline (`en`) -> Default Template.
4. Worker persists `locale_used` in `notification_log`.
5. HR/Admin manages translations per locale in `notification-templates`.

### Potential Risks & Mitigations
1. Google Workspace SMTP relay rate quota burst -> worker dispatch throttling (`SMTP_THROTTLE_PER_MINUTE`).
2. Missing translations for custom locales -> fallback to English baseline (`en`).
3. SMTP downtime -> transactional outbox isolation (Rule 15) and max 3 retries with backoff (Rule 18).
4. PII leakage -> template renderer strictly excludes scores and comments (Rule 16).
5. Mandatory notification tampering -> API rejects disabling `RESULT_PUBLISHED` with 422 (Rule 17).
6. Retention job contention -> batched deletion (Rule 19).

### Required ADR / Clarification
- None.

## Inputs Reviewed
- Step 2 findings, LLD 21.2, user requirement for multi-language with default `en`.

## Actions and Evidence
- Evaluated database locks, worker polling concurrency, throttling requirements, and audit scopes.
- Revised deliverable to explicitly incorporate multi-language details and `en` fallback hierarchy.

## Changes Made
- Updated impact matrix and documented multi-language architecture.

## Decisions and Rationale
- Enforced English (`en`) as the canonical default and required baseline.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan.
