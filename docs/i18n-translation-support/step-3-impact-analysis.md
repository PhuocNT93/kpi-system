# Step 3: Impact Analysis

Status: produced during this step

## Deliverable
### Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| **Database & Migrations** | High | Creates new table `i18n_translation` with unique constraint `(entity_type, entity_id, field_name, locale)`. Adds `locale` column to `user_account`. |
| **Backend API & Middleware** | High | Adds locale resolution middleware. Implements `/api/i18n/locales`, `/api/i18n/:entity_type/:entity_id` (GET/PUT), and `/api/users/me/locale` (PATCH). |
| **I18n Service & Cache** | High | Creates generic `I18nService` providing locale-based translation lookup, fallback to `'en'`, bulk translation upsert, and caching mechanism. |
| **Master Data Modules** | Medium | Updates Department, Team, Role, Job Level, Review Cadence, Criteria, Criterion Level, and Evaluation Template services/repositories to resolve localized names/descriptions. |
| **Evaluation Snapshotting** | Medium | Updates `evaluation_item` creation logic so `criterion_name_snapshot` is stored as a `jsonb` map containing all available entity translations. |
| **Audit & Security** | Medium | Upserting translations records audit logs (`entity_type = I18N_TRANSLATION`). RBAC restricts `/i18n` edit endpoints to HR_ADMIN / SYSTEM_ADMIN. |

## Inputs Reviewed
- Current code architecture across backend modules.

## Actions and Evidence
- Evaluated impact across database, auth middleware, master data repositories, and snapshot mechanisms.

## Decisions and Rationale
- Minimal breaking changes by defaulting fallback locale to `'en'` and maintaining legacy column compatibility where needed.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
