# Step 5: Define Test Cases

Status: reconstructed during Step 6

## Deliverable
## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Template List displays correctly | Navigated to `/templates` | View list table | Renders list with Name, Status badge, Version, Criterion count, and CTAs. |
| TC02 | Published Version direct edit block | Status is `PUBLISHED` | Click "Edit Draft" | Read-only view displayed with "Create New Version" CTA. |
| TC03 | Add Criterion from Library | Draft template open | Click "Add to Template" | Criterion added to Canvas; weight updates; duplicate blocked. |
| TC04 | Inline Weight Edit & Real-time Validation | Criteria total 85% | Edit weight to 35% | Status changes to Success (100%, Ready to publish). |
| TC05 | Overweight Validation Block | Criteria total 108% | Click "Publish" | Validation fails (`WEIGHT_TOTAL_NOT_100`); Publish blocked. |
| TC06 | Configuration Provenance Resolution | Criterion has 4-tier values | Open Provenance Popover | Displays 4 tiers and highlights `Template` as effective source. |
| TC07 | Applicability Matrix Summary | Set Role = SI & Team = Team A | Save applicability | Canvas card shows `Applies to: Software Engineer AND Team A`. |
| TC08 | Dynamic Scoring Rule Range Threshold | Rule = RANGE_THRESHOLD | Enter overlapping ranges | Inline warning `⚠ Range overlaps with Level 2`. |
| TC09 | Role Conditional Rule Validation | Rule = ROLE_CONDITIONAL | Applicable role missing branch | Error `⚠ Role "Business Analyst" has no scoring branch`. |
| TC10 | Generic Level Editor | Criterion selected in Drawer | Add Level 6, update score | Level list updates, reorders, and persists upon save. |
| TC11 | Validation Error Deep Links | 3 validation errors exist | Click error in modal | Auto-focuses failing criterion in Canvas/Drawer. |
| TC12 | Publish Confirmation & Snapshot | 100% weight, 0 errors | Click "Publish" -> Confirm | Status updates to `PUBLISHED`, locked view rendered. |
| TC13 | Version Comparison Diff Viewer | V1 and V2 exist | Click "Compare V1 vs V2" | Diff modal highlights added/removed criteria and changed weight/rules. |
| TC14 | Optimistic Lock Conflict (HTTP 409) | Concurrent edit on server | Click "Save Draft" | Banner displays conflict notification with reload option. |
| TC15 | Unsaved Changes Prompt | Draft modified | Navigate away | Prompt warns about unsaved changes. |

## Inputs Reviewed
- Step 4 plan.

## Actions and Evidence
- Mapped acceptance criteria and edge cases to test matrix TC01-TC15.

## Changes Made
- Documented test cases artifact.

## Decisions and Rationale
- High coverage of weight edge cases, scoring rule validation, and version immutability.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implementation
