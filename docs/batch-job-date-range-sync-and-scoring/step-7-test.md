# Step 7: Test

Status: produced during this step

## Deliverable

## Test Results

### 1. Test Suite Execution
- **Command**: `npm test` (Backend Vitest suite)
- **Result**: PASSED
  - 62 test files passed (6 skipped)
  - 686 tests passed (30 skipped)
  - Execution time: ~18.5s

### 2. Penalty Scoring Unit Tests (`penalty-scoring.test.ts`)
- **TC07**: Baseline 100 with zero infractions reaches perfect score 100 (Level 5) -> PASSED
- **TC08**: Critical bugs and delayed tasks apply correct deductions -> PASSED
  - Critical bug deduction: -15
  - Delayed task deduction: -10
- **TC09**: High task volume and high complexity yield productivity bonus -> PASSED
  - Productivity volume bonus: +5
  - High complexity bonus: +5
- **TC10**: Penalty score clamps strictly between [0, 100] -> PASSED
  - Underflow protection: clamped at 0
  - Overflow protection: clamped at 100
- **TC11**: Infraction Ceiling strictly prevents bonuses from masking disciplinary infractions -> PASSED
  - Critical bug deduction: -15
  - Volume (+5) & complexity (+5) bonuses total +10
  - Raw score: 95, Ceiling: 85 -> Final score strictly capped at 85
- **TC12**: Strictness mode scales deductions, bonuses, and final scores (EASY > MEDIUM > HARD) -> PASSED
  - EASY mode produces highest score with lenient penalties
  - MEDIUM mode produces balanced score with standard Tech Lead penalties
  - HARD mode produces lowest score with stringent Architect penalties
- **TC13**: detectEvaluationStrictness automatically resolves UI prompt presets correctly -> PASSED
  - Mức 3: Khó (Chuyên sâu & Khắt khe) -> HARD
  - Mức 2: Vừa (Tiêu chuẩn Tech Lead) -> MEDIUM
  - Mức 1: Dễ (Tóm tắt nhanh) -> EASY

### 3. Type Checking
- **Backend**: `npm run typecheck` -> PASSED (0 errors)
- **Frontend**: `npm run typecheck` -> PASSED (0 errors)

### 4. Code Quality & Linting
- **Backend**: `npm run lint` -> PASSED (0 errors)
- **Frontend**: `npm run lint` -> PASSED (0 errors)

### 5. Verification of Bug Fixes
- **Bug 1 (Duplicate Attendance Records & Inflated Work Days)**:
  - Cause: `collector_monthly_snapshot` contained multiple snapshots across import runs; queries in `batch-job.scheduler.ts` did not use `DISTINCT ON` and the loop lacked record deduplication.
  - Fix: Added `SELECT DISTINCT ON (year_month) ... ORDER BY year_month, created_at DESC` for attendance, `DISTINCT ON (year_month, target_member)` for tasks, and in-memory deduplication `Set<string>` by `${empCode}#${dateStr}`.
  - Verified: Thái Thanh Xuân (`203755`) work days normalized from 90 to 76; late records reduced from 2 duplicates to exactly 1 record (`Sep-11-2026`, 6 mins late).
- **Bug 2 (Uncalibrated Attendance Card & 100.0 Score Despite Infractions)**:
  - Cause: Punctuality $\ge 95\%$ was hardcoded to yield 10.0/10 points (Level 5); productivity bonuses fully offset attendance deductions up to 100.0.
  - Fix:
    1. Capped `attScore10` at 9.0 and `resolved_level` at Level 4 (Tốt) whenever late days exist.
    2. Infraction Ceiling: Final score is capped at `100 - disciplinePenalty` (e.g. 98.0 for 1 late day in MEDIUM mode).
    3. Level 5 (Xuất sắc) condition: Requires overallScore $\ge 95$ AND zero discipline infractions (`disciplinePenalty === 0`).
- **Bug 3 (Strictness Gradation - Dễ, Vừa, Khó)**:
  - Cause: AI task prompt template presets in `CollectorScriptEditorPage.tsx` did not propagate distinct evaluation criteria or scoring parameters to the engine.
  - Fix: Engine detects strictness mode from template; Gemini prompt instructions, heuristic fallback, penalty deduction rates, and bonus thresholds scale proportionally so that Khó yields lower scores and Dễ yields higher scores.
- **Bug 4 (5 Members Showing 'Chỉ Jira' Due to Team Part Snapshot Shadowing)**:
  - Cause: `collector_monthly_snapshot` stores attendance partitioned by team part (`Maritime Solutions Part` and `ALLEGRO NX Part`). The query used `DISTINCT ON (year_month)`, causing `Maritime Solutions Part` (created at 08:52:13) to shadow and drop `ALLEGRO NX Part` (created at 08:51:50, containing 12 employees including 5 who had no records in `TASKS` snapshot).
  - Fix: Updated query in `batch-job.scheduler.ts` to `SELECT DISTINCT ON (year_month, target_member)` to load all parts.
  - Verified: All 19/19 members now have Blueprint attendance records; in-memory deduplication prevents any date overlap; all 19 members will display `🚢 Tích hợp` instead of `Chỉ Jira`.

## Next Step
- Step 8: User Review
