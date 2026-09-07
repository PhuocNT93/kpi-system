# Frontend User Guide — i18n Admin

Status: produced during this step

## Prerequisites
- Frontend running (`npm run dev`) and backend API reachable via `VITE_API_BASE_URL`.
- Authenticated user with role `SYSTEM_ADMIN` or `HR_ADMIN`.

## Startup
1. Run frontend: `npm run dev` in `frontend/`.
2. Login as admin and open `/admin/i18n`.

## What the UI does
- Shows available locales from `GET /i18n/locales`.
- Allows admins to load and edit translations for any entity by entering `entity_type` and `entity_id`.
- Saves translations via `PUT /i18n/:entity_type/:entity_id` with payload shape `{ en: { field: value }, vi: { field: value } }`.
- Allows updating the current user's preferred locale via `PUT /i18n/user/locale`.

## Validation and behavior
- Client validates `en` baseline exists before attempting save.
- Backend enforces English baseline and will reject invalid payloads.

## Known limitations
- Minimal editor (table of fields × locales). Not a full CMS.
- No import/export, no translation memory, no pluralization handling.
