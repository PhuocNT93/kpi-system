# Step 4: Plan

Status: reconstructed during Step 6

## Deliverable
## Implementation Plan

1. **Feature Domain Models & API Types:**
   - Where: `frontend/src/features/templates/domain/template-models.ts`, `template-mappers.ts`
   - Why: Establish frontend type system and DTO mappers.
   - Tests: `template-mappers.test.ts`

2. **API Client Integration Hooks:**
   - Where: `frontend/src/features/templates/api/template-api.ts`, `use-templates.ts`
   - Why: Integration with backend configuration endpoints and TanStack Query.

3. **Template List Screen:**
   - Where: `frontend/src/features/templates/components/TemplateListScreen.tsx`
   - Why: HR Dashboard for managing evaluation templates.

4. **Template Builder Main Workspace & Canvas:**
   - Where: `frontend/src/features/templates/components/TemplateBuilderWorkspace.tsx`, `CriterionLibraryPanel.tsx`, `SelectedCriteriaCanvas.tsx`
   - Why: Dual-pane low-code workspace for template creation.

5. **Weight Real-Time Validation & Provenance Popovers:**
   - Where: `frontend/src/features/templates/components/WeightStatusBar.tsx`, `ProvenancePopover.tsx`
   - Why: Real-time weight visual feedback and explainable precedence rules.

6. **Criterion Configuration Drawer & Dynamic Scoring Editors:**
   - Where: `frontend/src/features/templates/components/CriterionConfigDrawer.tsx`, `ApplicabilityEditor.tsx`, `LevelEditor.tsx`, `ScoringRuleEditors.tsx`
   - Why: Deep configuration slide-over drawer with visual form editors.

7. **Validation Results, Publish Flow & Immutable State UI:**
   - Where: `frontend/src/features/templates/components/ValidationResultsModal.tsx`, `PublishConfirmationModal.tsx`, `VersionHistoryDiffModal.tsx`, `ConflictResolutionModal.tsx`
   - Why: Governance, validation jump links, immutability locking, version comparison, and HTTP 409 conflict handling.

8. **Main Navigation Routing & Feature Export:**
   - Where: `frontend/src/features/templates/index.ts`, `frontend/src/App.tsx`
   - Why: Application routing and navigation integration.

## Inputs Reviewed
- Step 1-3 approved deliverables.

## Actions and Evidence
- Structured multi-tier frontend plan.

## Changes Made
- Documented implementation plan.

## Decisions and Rationale
- Modular UI component strategy for clean maintainability and testability.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases
