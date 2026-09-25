# Step 2: Investigate

Status: reconstructed from earlier approved response

## Deliverable

## Investigation Findings

### Code Locations
- `backend/src/modules/jira-crawler/jira-client.ts`: `fetchMemberIssues`, `aggregateMemberMetrics`.
- `backend/src/modules/jira-crawler/batch-job.scheduler.ts`: `getManagedMembersFromDb`, `loadBlueprintSummaries`, in-memory deduplication, blending.
- `backend/src/modules/jira-crawler/ai-evaluator.ts`: `detectEvaluationStrictness`, `calculatePenaltyScore`, Infraction Ceiling, Level 5 condition.
- `frontend/src/features/collector/pages/JiraCollectorPage.tsx`: Cột Blueprint CLV, bảng kết quả batch.

### Schema & Contract Findings
- `collector_monthly_snapshot`: `source_type` ('TEAM_ATTENDANCE', 'TASKS'), `year_month`, `target_member`.
- `employee`: `review_cadence_months`, `last_evaluation_completed_at`, `next_review_due_date`.
- `batch_eval_run`: lịch sử các phiên batch.

### Existing Pattern Findings
- Mô hình trừ điểm từ mốc 100 điểm.
- Punctuality rate khống chế tối đa 9.0 (Level 4) khi có trễ hạn.
- Phân cấp nghiêm ngặt EASY, MEDIUM, HARD.

### Risks Identified
- Tài liệu cần đồng bộ 100% với code sau khi fix lỗi snapshot đa bộ phận.

## Next Step
- Step 3: Impact Analysis
