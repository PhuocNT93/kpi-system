# Step 4: Plan

Status: produced during this step

## Deliverable
### Implementation Plan

1. Database Migration (`backend/migrations/1788497045529_create_i18n_translation.ts`):
   - Create `i18n_translation` table.
   - Add constraint `uq_i18n_translation_entity_field_locale`.
   - Add index `idx_i18n_translation_entity`.
   - Add `locale` column to `user_account`.

2. I18n Domain & Module (`backend/src/modules/i18n/`):
   - Define types, `PostgresI18nRepository`, `I18nService`, `I18nController`, and express router.

3. Locale Resolution Middleware (`backend/src/shared/i18n/locale.middleware.ts`):
   - Priority resolution: `user_account.locale` -> `?locale=` -> `Accept-Language` -> `'en'`.

4. Master Data Integration:
   - Hydrate translations in Organization, Configuration, and Employee modules.

5. Evaluation Item Snapshot (`jsonb`):
   - Store `criterion_name_snapshot` as `jsonb` map containing all available translations.

6. API Registration:
   - Register routes and middleware in `app.ts` and `routes.ts`.

7. Testing:
   - Write integration tests for I18n module and evaluation snapshotting.

## Inputs Reviewed
- Impact analysis and system requirements.

## Actions and Evidence
- Formulated step-by-step technical implementation sequence.

## Decisions and Rationale
- Modularity first: isolate i18n logic into a reusable `i18n` module.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases
