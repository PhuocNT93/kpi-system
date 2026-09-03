# Step 5: Define Test Cases

Status: reconstructed from approved response

## Deliverable
## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Lọc danh sách theo tất cả 9 trạng thái | Đã có các cycle với các trạng thái khác nhau trong hệ thống | Chọn từng option trong dropdown Status (`DRAFT`, `OPEN`, `IN_PROGRESS`, `SUBMITTED`, `REVIEWING`, `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`) | Danh sách bảng chỉ hiển thị các cycle khớp đúng trạng thái được chọn |
| TC02 | Chuyển trạng thái hợp lệ trên Backend | Cycle đang ở trạng thái `OPEN`, user là HR_ADMIN | Gọi `POST /api/evaluation-cycles/:id/transition` với `{ target_status: "IN_PROGRESS" }` | Trả về status HTTP 200, status chuyển thành `IN_PROGRESS`, ghi audit log |
| TC03 | Chuyển trạng thái không hợp lệ | Cycle đang ở trạng thái `DRAFT` | Gọi `POST /api/evaluation-cycles/:id/transition` với `{ target_status: "APPROVED" }` | Trả về HTTP 409 Conflict với error code `INVALID_CYCLE_STATE_TRANSITION` |
| TC04 | Chuyển trạng thái khi đã LOCKED | Cycle đang ở trạng thái `LOCKED` | Gọi `POST /api/evaluation-cycles/:id/transition` với `{ target_status: "OPEN" }` | Trả về HTTP 409 Conflict, chu kỳ không bị thay đổi |
| TC05 | Timeline hiển thị đúng mốc trạng thái hiện tại | Cycle có status `REVIEWING` | Mở trang chi tiết `/admin/cycles/:id` | Timeline hiển thị các bước trước đó là Completed (`DRAFT`, `OPEN`, `IN_PROGRESS`, `SUBMITTED`), bước `REVIEWING` là Active |
| TC06 | Detail page hiển thị nút chuyển trạng thái phù hợp | Cycle có status `OPEN` | Mở trang chi tiết `/admin/cycles/:id` | Hiển thị nút thao tác chuyển sang `IN_PROGRESS` và `LOCK` |
| TC07 | Quyền RBAC khi gọi Transition API | User có role `EMPLOYEE` | Gọi `POST /api/evaluation-cycles/:id/transition` | Trả về HTTP 403 Forbidden |

## Inputs Reviewed
- Requirement criteria and test requirements

## Actions and Evidence
- Documented happy path, validation, boundary, error, and RBAC test cases

## Changes Made
- None in Step 5

## Decisions and Rationale
- Ensure test cases cover backend state validation and UI rendering

## Risks / Blockers
- None

## Next Step
- Step 6: Implement
