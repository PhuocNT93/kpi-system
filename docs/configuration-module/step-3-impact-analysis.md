# Step 3: Impact Analysis

Status: reconstructed from approved step 3

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
| --- | --- | --- |
| **Backend Architecture** | High | Adds new `configuration` module under `backend/src/modules/configuration` with clean separation of services (`CriterionService`, `ScoringRuleService`, `TemplateService`, `EffectiveConfigurationResolver`, `ConfigurationValidationService`, `ConfigurationPublishingService`, `ConfigurationAuditService`, etc.). |
| **Database & Migrations** | High | Adds migration `1724500000006_create_configuration_tables.ts` for tables: `criteria`, `criterion_versions`, `evaluation_levels`, `scoring_rules`, `evaluation_templates`, `evaluation_template_versions`, `template_criteria`, `role_overrides`, `team_overrides`, `template_overrides`, `workflow_definitions`, `workflow_states`, `workflow_transitions`, `configuration_audit_logs`. Includes foreign keys, indexes, and unique constraints. |
| **API Contracts** | High | Adds `/api/v1/configuration/...` endpoints covering Criteria, Criterion Versions, Evaluation Levels, Scoring Rules, Templates, Template Versions, Template Criteria, Overrides, Effective Configuration Resolver, Preview, Validation, Diff, Clone, Snapshot, Workflows, and Audit Logs. |
| **RBAC / Security** | Medium | Adds permissions: `CONFIGURATION_READ`, `CONFIGURATION_CREATE`, `CONFIGURATION_UPDATE`, `CONFIGURATION_VALIDATE`, `CONFIGURATION_PUBLISH`, `CONFIGURATION_RETIRE`, `CONFIGURATION_OVERRIDE`, `CONFIGURATION_AUDIT_READ`. Protects endpoints with `requirePermission`. |
| **Optimistic Locking** | Medium | Uses `version` integer column on editable draft entities (`criteria`, `criterion_versions`, `scoring_rules`, `evaluation_templates`, `evaluation_template_versions`, `workflow_definitions`). Concurrent updates throw `VersionMismatch` (`409 Conflict`). |
| **Immutability & Lifecycle** | High | Published versions cannot be mutated (`VERSION_ALREADY_PUBLISHED` / `PUBLISHED_CONFIGURATION_IMMUTABLE`). Updating published config requires cloning to a new draft version. |
| **Scoring Rules & Precedence** | High | Validates rules (`RANGE_THRESHOLD` with `[min, max)` boundaries, `INVERSE_THRESHOLD`, `COUNT_THRESHOLD`, `ORDINAL_MANUAL`, `ROLE_CONDITIONAL`). Resolves layered overrides in deterministic order: `Template Override > Team Override > Role Override > Criterion Version Default > System Default`. |
| **Audit & Snapshots** | Medium | All actions generate append-only logs in `configuration_audit_logs`. Snapshot API extracts full JSON snapshot for cycle isolation. |
| **Performance & Caching** | Low | Effective configuration resolver is read-heavy and deterministic; indexing on `(template_version_id)`, `(criterion_id, version_no)`, codes, and foreign keys ensures fast resolution. |

## Inputs Reviewed
- Database schema requirements and domain rules.

## Actions and Evidence
- Conducted impact analysis on all system layers.

## Changes Made
- None.

## Decisions and Rationale
- Ensure transactions, optimistic locking, and immutability guards are implemented at repository/service level.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
