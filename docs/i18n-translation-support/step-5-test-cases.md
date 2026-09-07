# Step 5: Define Test Cases

Status: produced during this step

## Deliverable
### Test Cases Matrix

| Test Case ID | Scope / Subject | Input / Condition | Expected Result |
|---|---|---|---|
| **TC-I18N-01** | Database Migration | Run database migration `1788497045529_create_i18n_translation.ts` | Table `i18n_translation` created with PK, UNIQUE `(entity_type, entity_id, field_name, locale)` constraint, and composite index. `user_account.locale` column added. |
| **TC-I18N-02** | I18n Service - Upsert & Validation | Call `I18nService.upsertEntityTranslations` with `{ vi: { name: 'Phong Ban' } }` (missing 'en') | Throws `BadRequest` validation error enforcing Rule 12 (`en` locale required). |
| **TC-I18N-03** | I18n Service - English Baseline & Fallback | Entity has translations for `en` (`"Department"`) and `vi` (`"Phòng Ban"`). Query with `locale='vi'` vs `locale='ja'` | Query `vi` returns `"Phòng Ban"`. Query `ja` (missing translation) falls back to `"Department"`. |
| **TC-I18N-04** | Locale Middleware | Request with `?locale=vi` or `Accept-Language: vi-VN` | `req.locale` is set to `'vi'`. |
| **TC-I18N-05** | API - Get/Put Translations | `GET /api/i18n/DEPARTMENT/{id}` and `PUT /api/i18n/DEPARTMENT/{id}` as HR_ADMIN | `PUT` saves translation map `{ en: {...}, vi: {...} }` and creates `audit_log` entry. `GET` returns all translations for all locales. |
| **TC-I18N-06** | API - User Preferred Locale | `PATCH /api/users/me/locale` with `{ locale: 'vi' }` | Updates `user_account.locale` for logged-in user. Subsequent requests use `'vi'` by default. |
| **TC-I18N-07** | Evaluation Snapshot (`jsonb`) | Create evaluation item for a criterion with `en` and `vi` translations | `evaluation_item.criterion_name_snapshot` stores `{"en": "On-time Completion", "vi": "Hoàn thành đúng hạn"}` as a `jsonb` map. |
| **TC-I18N-08** | RBAC Protection | Call `PUT /api/i18n/DEPARTMENT/{id}` as regular `EMPLOYEE` | Returns `403 Forbidden`. |

## Inputs Reviewed
- Implementation plan and acceptance criteria.

## Actions and Evidence
- Defined comprehensive test suite covering DB, Service validation, Fallback, Middleware, APIs, and Snapshotting.

## Decisions and Rationale
- Ensure strict coverage of business rules 12, 13, and 14.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implementation
