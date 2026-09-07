# Step 6: Implementation

Status: produced during this step

## Deliverable
### Changes Made
1. **Database Migration** (`backend/migrations/1788497045529_create_i18n_translation.ts`):
   - Created `i18n_translation` table with composite index `idx_i18n_translation_entity` and unique constraint `uq_i18n_translation_entity_field_locale`.
   - Added `locale` column to `app_user` table.
   - Converted `evaluation_item.criterion_name_snapshot` to `jsonb`.

2. **I18n Module**:
   - `backend/src/modules/i18n/domain/i18n.types.ts`: Defined domain types and schema.
   - `backend/src/modules/i18n/domain/i18n.repository.ts`: Interface for repository.
   - `backend/src/modules/i18n/infrastructure/postgres-i18n.repository.ts`: PostgreSQL repository implementation.
   - `backend/src/modules/i18n/application/i18n.service.ts`: Core application service enforcing Rule 12 (English baseline required) and fallback resolution logic.
   - `backend/src/modules/i18n/api/i18n.controller.ts`: API controller for `/api/i18n/*` and `/api/users/me/locale`.
   - `backend/src/modules/i18n/api/i18n.router.ts`: Express router with JWT and RBAC protection.
   - `backend/src/modules/i18n/i18n.module.ts`: Module factory.

3. **Locale Resolution Middleware**:
   - `backend/src/shared/i18n/locale.middleware.ts`: Middleware extracting preferred locale from actor context, `?locale=` query parameter, or `Accept-Language` header.

4. **Evaluation Snapshotting**:
   - `backend/src/modules/evaluation-cycle/application/evaluation-cycle-opening.service.ts`: Updated cycle opening logic to load `i18n_translation` records for criteria and snapshot them as a `jsonb` map in `evaluation_item.criterion_name_snapshot` (Rule 13).

5. **API Wiring & App Integration**:
   - `backend/src/app.ts` & `backend/src/api/routes.ts`: Registered `localeMiddleware` and `/api/i18n` routes.

## Inputs Reviewed
- Implementation plan and LLD v1.5 requirements.

## Actions and Evidence
- All files created and updated as planned.

## Decisions and Rationale
- Strictly adhered to modular monolith guidelines and LLD v1.5 generic polymorphic `i18n_translation` specification.

## Risks / Blockers
- None.

## Next Step
- Step 7: Test
