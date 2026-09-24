# Step 6: Implementation

Status: produced during this step

## Deliverable

## Implementation

Changes Made:
- `backend/src/modules/jira-crawler/batch-job.scheduler.ts`:
  - Thay mốc hardcoded `dateTo = today` thành `dateTo = member.nextReviewDueDate || today`, cho phép batch job thu thập dữ liệu Jira/Blueprint theo đúng review window của từng cá nhân.
  - Tích hợp trừ điểm chuyên cần (late days) vào `penaltyBreakdown` khi blend dữ liệu Blueprint UI_TAT_028.
- `backend/src/modules/jira-crawler/jira-crawler.controller.ts`:
  - Cập nhật `recommendedDateTo` dùng `nextReview || today` trong API `GET /api/collector/jira/members`.
- `backend/src/modules/employee/domain/employee.domain.ts`:
  - Thêm `reviewCadenceMonths?: number | null;` vào entity interface `Employee`.
- `backend/src/modules/employee/infrastructure/postgres-employee.repository.ts`:
  - Thêm `review_cadence_months` vào các câu lệnh SQL `SELECT` (`findById`, `findByCode`, `findMany`), `INSERT` (`create`), và `UPDATE` (`update`).
  - Thêm helper `cadenceToMonths` quy đổi chu kỳ sang số tháng (MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL/BIANNUALLY: 6, ANNUAL/ANNUALLY: 12).
  - Map `reviewCadenceMonths` trong `mapRowToEmployee`.
- `backend/src/modules/employee/api/employee.controller.ts`:
  - Bổ sung helper `cadenceToMonths`.
  - Trong `updateEmployee` và `createEmployee`: tự động tính `reviewCadenceMonths` và tính lại `nextReviewDueDate` từ `last_evaluation_completed_at` + cadence khi HR chỉnh sửa trên Organization.
  - Map `review_cadence_months` trong `mapEmployeeToResponse`.
- `backend/src/modules/jira-crawler/ai-evaluator.ts`:
  - Bổ sung interface `ScoreDeductionItem`, `ScoreBonusItem`, `PenaltyBreakdown`.
  - Thêm method `calculatePenaltyScore` tính điểm theo cơ chế Penalty từ mốc 100 điểm ban đầu: trừ điểm Code Quality (critical bugs), trừ điểm trễ hạn bàn giao (delayed tasks), cộng thưởng năng suất, clamp trong khoảng [0, 100].
  - Tích hợp `penaltyBreakdown` vào `MemberBatchResult`.
- `backend/src/modules/jira-crawler/penalty-scoring.test.ts`:
  - Tạo bộ unit test kiểm thử toàn diện các scenario TC07 - TC10.
- `frontend/src/features/collector/pages/CollectorScriptEditorPage.tsx`:
  - Chuyển cột "Chu kỳ Review" trong bảng nhân sự từ dropdown `<select>` thành thẻ hiển thị chỉ xem (read-only view), phản ánh đúng nguyên tắc: chu kỳ review chỉ được cấu hình bên module Organization.
- `frontend/src/features/organization/components/EmployeeTable.tsx`:
- `backend/src/modules/jira-crawler/jira-client.ts`:
  - Mở rộng hàm `fetchMemberIssues` nhận thêm `email`, `jiraUsername`, `blueprintUsername`.
  - Tự động phân giải danh sách tài khoản Jira gồm: `employeeCode`, `jiraUsername`, `blueprintUsername` và tiền tố email (`email.split('@')[0]`).
  - Mở rộng JQL tự động sang `assignee in (...)`, `cf[11902] in (...)`, và `worklogAuthor in (...)`. Khắc phục triệt để lỗi anh Đức (và các nhân sự khác) bị 0 task do Jira username `duc.nguyen` khác mã nhân sự `173232`.
  - Cập nhật các đường link URL trỏ sang Jira (`filterUrl`, `inProgressFilterUrl`, `completedFilterUrl`) để hỗ trợ đầy đủ các tài khoản định danh.
- `backend/src/modules/jira-crawler/batch-job.scheduler.ts`:
  - Truyền `email` và `blueprintUsername` vào `fetchMemberIssues` cho từng nhân sự khi chạy batch job tự động.
- `backend/src/modules/jira-crawler/jira-crawler.controller.ts`:
  - Truyền `email` và `blueprintUsername` vào `fetchMemberIssues` trong `testScript` và `evaluateMember`.
- `backend/src/modules/jira-crawler/ai-evaluator.ts`:
  - Nâng cấp `evaluateTaskContributions`: phân tích và đánh giá cả task đã hoàn thành (`completedTasks`) lẫn task đang thực hiện (`inProgressTasks`) (tối đa 25 task), không còn bị trả về mảng rỗng `[]` khi nhân sự chỉ có task đang thực hiện.
  - Tùy biến AI prompt và Heuristic Fallback để sinh nhận xét, độ phức tạp và mức độ đóng góp chính xác cho cả task đang làm (dựa trên tiến độ, due date, log work).
- `frontend/src/features/collector/api/jira-collector-api.ts`:
  - Định nghĩa kiểu `JiraIssueRecord` và bổ sung `tasks?: JiraIssueRecord[]` vào `MemberJiraMetrics`.
- `backend/src/modules/jira-crawler/batch-job.scheduler.ts`:
  - Khắc phục triệt để lỗi nhân đôi bản ghi đi trễ (duplicate attendance records): áp dụng `DISTINCT ON (year_month)` trên SQL query bảng `collector_monthly_snapshot` và bổ sung cơ chế khử trùng lặp trong bộ nhớ `seenEmpDates = new Set<string>()` theo `${empCode}#${dateStr}`. Tổng số ngày công của Thái Thanh Xuân chuẩn hóa từ 90 ngày xuống 76 ngày, số bản ghi trễ giảm từ 2 bản ghi trùng lặp xuống đúng 1 bản ghi (ngày Sep-11-2026, 6 phút trễ).
  - Chuẩn hóa điểm chuyên cần `attScore10` và xếp loại `attLevel`: khi nhân viên có ngày đi trễ (`lateDays > 0`), điểm chuyên cần khống chế tối đa 9.0/10 (Mức 4 - Tốt), không bao giờ đạt điểm tuyệt đối 10.0/10 hay Mức 5 (Xuất sắc).
  - Tích hợp nguyên tắc Trần Điểm Vi Phạm (Infraction Ceiling) và tỷ lệ phạt chuyên cần theo mức độ nghiêm ngặt: `HARD` trừ 3đ/ngày trễ, `MEDIUM` trừ 2đ/ngày trễ, `EASY` trừ 1đ/ngày trễ. Điểm thưởng năng suất KHÔNG ĐƯỢC phép xóa sạch vi phạm kỷ luật để đạt 100 điểm (`ceiling = 100 - disciplinePenalty`).
  - Điều kiện đạt Mức 5 (Xuất sắc): Điểm tổng phải $\ge 95$ VÀ không có bất kỳ vi phạm chuyên cần/kỷ luật nào (`disciplinePenalty === 0`). Nhân viên đi trễ đạt tối đa Mức 4 (Tốt).
- `backend/src/modules/jira-crawler/ai-evaluator.ts`:
  - Bổ sung type `EvaluationStrictness` ('EASY' | 'MEDIUM' | 'HARD') và hàm `detectEvaluationStrictness(promptTemplate)` tự động nhận diện chế độ đánh giá từ 3 mẫu Prompt AI Preset trên giao diện (Mức 1: Dễ / Nhanh gọn, Mức 2: Vừa / Tiêu chuẩn Tech Lead, Mức 3: Khó / Khắt khe cấp Architect).
  - Bổ sung `getStrictnessMode()` vào `AiScoringEngine`.
  - Nâng cấp `evaluateTaskContributions`: tiêm tiêu chuẩn thẩm định linh hoạt vào prompt gửi cho Gemini theo chế độ Dễ / Vừa / Khó tương ứng.
  - Nâng cấp `generateFallbackTaskContributions`: hiệu chỉnh thang chấm độ phức tạp (complexityScore) và đóng góp (contributionScore) theo đúng mức độ nghiêm ngặt (ở chế độ Khó, chỉ các task kiến trúc hoặc > 10h mới đạt Level 4-5; task trễ hạn bị phạt nặng).
  - Nâng cấp `calculatePenaltyScore`: cấu hình riêng biệt bộ tham số trừ điểm vi phạm (critical bug, minor bug, delayed task) và điều kiện thưởng (volume, complexity) theo 3 cấp độ. Cấp độ Khó cho điểm thấp hơn rõ rệt so với cấp độ Vừa và Dễ. Áp dụng trần điểm vi phạm `Infraction Ceiling`.
- `backend/src/modules/jira-crawler/penalty-scoring.test.ts`:
  - Bổ sung các unit test kiểm thử: TC11 (Infraction Ceiling), TC12 (Strictness gradation: EASY > MEDIUM > HARD), TC13 (Tự động nhận diện prompt presets). Toàn bộ 7/7 tests pass.

Decisions Applied:
- Giữ nguyên cấu trúc API envelope `sendSuccess`/`sendCollection`.
- Tận dụng `review_cadence_months` đã có trong database migration mà không cần chạy migration mới.
- Đảm bảo tính toán tự động và đồng bộ tức thì: khi HR sửa mốc ngày bên Organization, Auto Collect đọc trực tiếp từ database mà không cần cấu hình thêm.

Deferred / Not Changed:
- Không thay đổi bảng `batch_eval_run` (cột `results` JSONB tự động lưu toàn bộ `penaltyBreakdown`).

## Inputs Reviewed
- Step 4 Plan and Step 5 Test Cases.

## Actions and Evidence
- Applied code modifications across all 6 files.
- Verified TypeScript compilation with `npm run typecheck` (passed with 0 errors).
- Executed `penalty-scoring.test.ts` with Vitest (4/4 tests passed).
- Executed full test suite with `npm test` (679/679 passed).
- Verified linter with `npm run lint` (0 errors).

## Changes Made
- See Deliverable above.

## Decisions and Rationale
- See Deliverable above.

## Risks / Blockers
- None.

## Next Step
- Step 7: Test
