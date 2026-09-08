# Step 1: Understand
Status: reconstructed

## Deliverable
Goal: Implement end-to-end CSV Preview and Partial/Strict Import feature.

Expected Behavior: CSV Upload produces a preview with row errors. User can select Partial or Strict import mode. Large files (>500 rows) are processed asynchronously in batches of 100-200.

Acceptance Criteria:
1. Preview API returns structured row errors.
2. Confirm API supports `strict_mode` parameter.
3. Partial mode imports valid rows and skips invalid rows.
4. Strict mode is fully atomic.
5. Large imports processed asynchronously.
6. KPI scores are recalculated from criterion results (CSV NEVER overrides KPI score directly).

Out of Scope: Creating a parallel import architecture or a second CSV parser. Adding a `kpi_score` column to CSV.

Business Rules Involved: Score Source of Truth, Strict Mode Atomicity, Historical Snapshot Protection.

Open Questions / Conflicts: None
