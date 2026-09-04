# Step 2: Investigate

Status: reconstructed

## Deliverable

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`
- `docs/Sequence_Diagrams_System.md`

Relevant Modules and Files:
- Configuration/template: `backend/src/modules/configuration/`
- Rule Engine: `backend/src/modules/rule-engine/`
- Evaluation: `backend/src/modules/evaluation/`
- Schema: `backend/migrations/1724500000001_init_database_schema.ts`, `1724500000010_add_template_kpi_layer.ts`
- Frontend: `frontend/src/features/evaluation/`

Existing Implementation:
- `template_kpi` and template criterion grouping/weights exist.
- Publish-time criterion effective-weight resolution exists.
- Rule Engine and configured strategies exist and are pure.
- Evaluation items snapshot criterion data, rule configuration, levels, and criterion weight.
- Evaluation score calculation, KPI aggregation, explicit N/A normalization, and complete recalculation integration are incomplete.
- Evaluation item snapshots lack KPI identity/name/weight and KPI-level result metadata.
- Frontend evaluation models/components lack KPI scoring breakdown and recalculation handling.

Existing Tests:
- Configuration tests cover precedence and strict weight validation.
- Evaluation tests cover setup and creation.
- Rule Engine tests cover existing strategies.
- Complete two-level scoring and snapshot regression coverage is missing.

Patterns to Reuse:
- Rule Engine and strategy registry.
- Publish-time effective configuration resolver.
- Evaluation snapshot creation and JSON mapping.
- Existing service/repository/controller separation, API envelope, workflow, permission, lock, version, audit, and TanStack Query patterns.

## Inputs Reviewed
- Required LLD/rules/sequence documents
- Targeted repository searches
- Explorer report for evaluation, configuration, Rule Engine, migrations, tests, and frontend

## Actions and Evidence
- Searched backend and frontend scoring/evaluation/KPI references.
- Inspected the explorer report identifying current gaps and reusable patterns.

## Changes Made
- None.

## Decisions and Rationale
- Extend existing KPI/template structures instead of introducing hard-coded mappings.

## Risks / Blockers
- KPI snapshot migration and score-field compatibility remain high-impact areas.

## Next Step
- Step 3: Impact Analysis.
