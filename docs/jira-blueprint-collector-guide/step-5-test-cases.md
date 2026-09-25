# Step 5: Test Cases

Status: reconstructed from earlier approved response

## Deliverable

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Kiểm tra sự tồn tại và định dạng Markdown | Sau khi tạo file tài liệu | Đọc file `docs/JIRA_BLUEPRINT_COLLECTOR_AND_SCORING_GUIDE.md` | File tồn tại, cấu trúc rõ ràng với đầy đủ 5 chương, các bảng biểu và biểu đồ Mermaid hiển thị hợp lệ. |
| TC02 | Đối soát cơ chế thu thập Jira | Mã nguồn tại `jira-client.ts` | Đối chiếu phương thức `fetchMemberIssues` và `aggregateMemberMetrics` với nội dung Chương 2 | Khớp 100% về cơ chế phân giải 4 loại định danh tài khoản, cú pháp JQL động và cách tính toán các chỉ số tasks/bugs/worklog. |
| TC03 | Đối soát cơ chế thu thập Blueprint CLV | Mã nguồn tại `batch-job.scheduler.ts` | Đối chiếu hàm `loadBlueprintSummaries` với nội dung Chương 3 | Khớp 100% về câu query SQL `DISTINCT ON (year_month, target_member)`, bộ lọc khử trùng lặp ngày công in-memory `${empCode}#${dateStr}`, và logic khống chế `attScore10 <= 9.0` khi có đi trễ. |
| TC04 | Đối soát công thức tính điểm Penalty & 3 cấp độ nghiêm ngặt | Mã nguồn tại `ai-evaluator.ts` | Đối chiếu method `calculatePenaltyScore` và `detectEvaluationStrictness` với nội dung Chương 4 | Bảng tham số trừ điểm và cộng thưởng của 3 mức `EASY`, `MEDIUM`, `HARD` khớp chính xác từng số liệu với code. |
| TC05 | Đối soát nguyên tắc Trần Điểm Vi Phạm (Infraction Ceiling) & Mức 5 | Unit tests tại `penalty-scoring.test.ts` | Đối chiếu TC11 & TC12 với nội dung phân tích Infraction Ceiling tại Chương 4 | Giải thích đúng nguyên tắc `ceiling = 100 - disciplinePenalty` và điều kiện đạt Level 5: `overallScore >= 95` VÀ `disciplinePenalty === 0`. |
| TC06 | Đối soát công thức hòa trộn (Blending) 50/50 | Logic blending trong `batch-job.scheduler.ts` | Đối chiếu công thức hòa trộn `PERF_01` với nội dung Chương 4 | Khớp công thức `blended = round(((normJira + bpTaskScore) / 2) * 10) / 10`. |

## Next Step
- Step 6: Implementation
