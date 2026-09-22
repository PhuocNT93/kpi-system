# Step 6: Implement

Status: produced during this step

## Deliverable

### Changes Made
- `frontend/src/features/collector/pages/JiraCollectorPage.tsx`:
  - Replaced table column status badge: `🚢 Hòa trộn` → `🚢 Tích hợp`.
  - Replaced evaluation modal badge: `🚢 Đã hòa trộn Blueprint CLV` → `🚢 Đã tích hợp Blueprint CLV`.
  - Replaced formula section header: `🔀 Công thức hòa trộn điểm:` → `🔀 Công thức tích hợp điểm:`.
  - Replaced criteria header tag: `🚢 Đã hòa trộn trung bình với Blueprint CLV` → `🚢 Đã tích hợp với Blueprint CLV`.
- `backend/src/modules/jira-crawler/batch-job.scheduler.ts`:
  - Replaced rationale header: `[🔀 Tích hợp Blueprint + Jira]` and comment tag `(Tích hợp 50% Blueprint + 50% Jira)`.
- `backend/src/modules/jira-crawler/jira-crawler.controller.ts`:
  - Replaced employee blending note: `hệ thống sẽ tự động tích hợp điểm trung bình (Blueprint + Jira)/2`.
  - Replaced final rationale: `Điểm tích hợp:` and final comment `(Tích hợp tự động 50% Blueprint + 50% Jira)`.
- `backend/src/modules/evaluation/application/services/evaluation.service.ts`:
  - Replaced evaluation service final rationale: `Điểm tích hợp 50/50:` and comment `(Tích hợp tự động 50% Blueprint + 50% Jira)`.

### Decisions Applied
- User explicitly selected the term "Tích hợp" to replace "Hòa trộn" across the entire user interface and backend rationale strings.
- Applied changes directly to preserve existing design layouts, badge colors, and calculation formulas.

### Deferred / Not Changed
- Underlying mathematical calculation `(Blueprint + Jira) / 2` remains unchanged as requested.
- Blueprint and Jira crawling logic remain unaffected.

## Inputs Reviewed
- `frontend/src/features/collector/pages/JiraCollectorPage.tsx`
- `backend/src/modules/jira-crawler/batch-job.scheduler.ts`
- `backend/src/modules/jira-crawler/jira-crawler.controller.ts`
- `backend/src/modules/evaluation/application/services/evaluation.service.ts`

## Actions and Evidence
- Ran `grep_search` across entire codebase to locate every occurrence of "hòa trộn".
- Updated all 4 affected files using `multi_replace_file_content` and `replace_file_content`.
- Verified 0 remaining occurrences with `grep_search`.
- Executed `npm run build` in `frontend` to verify TypeScript types and build stability.

## Changes Made
- Replaced 4 instances in frontend UI.
- Replaced 5 instances across 3 backend services and controllers.

## Decisions and Rationale
- Standardized terminology across UI and data layers to "Tích hợp" for professional clarity.

## Risks / Blockers
- None. Changes are purely label and presentation strings; no schema or database migrations required.

## Next Step
- Step 7: Test.
