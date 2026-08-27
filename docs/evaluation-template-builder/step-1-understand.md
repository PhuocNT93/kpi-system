# Step 1: Understand

Status: reconstructed during Step 6

## Deliverable
## Task Understanding

Goal: Design and implement a complete, production-ready enterprise SaaS UI/UX Evaluation Template Builder module within the Template & Criteria Configuration Module, enabling HR/Admin users to create, configure, validate, preview, and publish evaluation templates safely.

Expected Behavior:
- Centralized configuration hub for criterion versioning, scoring rules, levels, applicability matrix, and precedence overrides.
- Dual-pane desktop workspace with searchable Criterion Library and draggable Canvas.
- Explainable Configuration Provenance visualization across precedence tiers (Global -> Role -> Team -> Template).
- Dynamic Scoring Engine supporting 5 rule types (RANGE_THRESHOLD, INVERSE_THRESHOLD, COUNT_THRESHOLD, ORDINAL_MANUAL, ROLE_CONDITIONAL) and dynamic Level Editor.
- Version governance enforcing immutable Published versions and draft version creation.
- Detailed validation error diagnostics deep-linked to failing fields.

Acceptance Criteria:
1. Information Architecture & Template List table with status badges and action restrictions.
2. Workspace Header displaying breadcrumb, status, validation badge, and primary CTAs.
3. Searchable Criterion Library panel with previews and duplicate prevention.
4. Selected Criteria Canvas supporting reordering, direct weight inputs, optional toggles, and menus.
5. Weight UX with visual state feedback (100%, <100%, >100%) and distinction between Template vs Evaluation effective weight.
6. Slide-over Criterion Configuration Drawer.
7. Dynamic Scoring Rule Editors for all 5 rule types with overlap detection.
8. Generic Level Editor with score values, names, ordering, and validation.
9. Grouped validation results modal with deep links.
10. Publish confirmation modal and immutable read-only state.
11. Version history and visual diff comparison.
12. Optimistic locking handling (HTTP 409) and unsaved changes protection.

Out of Scope:
- Runtime evaluation scoring execution.
- Evaluation submit/review/calibration flows.
- CSV import execution.

Business Rules Involved:
- Precedence: Global -> Role -> Team -> Template.
- Immutability: Published versions are locked.
- Weight Validation: Total configured weight must equal 100%.
- Applicability: Role AND Team matching.
- Scoring rules non-overlapping and complete.

Open Questions / Conflicts:
- None.

## Inputs Reviewed
- `Pasted text #1` (UX/UI spec)
- `docs/LLD_Employee_Performance_Evaluation_System.md`

## Actions and Evidence
- Analyzed 48 detailed prompt requirements against system LLD.

## Changes Made
- Documented task understanding deliverable.

## Decisions and Rationale
- Align frontend implementation strictly with backend configuration module API rules and LLD precedence logic.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
