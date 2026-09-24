# Step 1: Understand

Status: produced during this step

## Deliverable

## Task Understanding

Goal:
Cập nhật dữ liệu cho 20 nhân viên trong bảng `employee` với các trường `review_cadence`, `review_cadence_months`, `last_evaluation_completed_at`, và `next_review_due_date` theo đúng bảng dữ liệu đa dạng đã được duyệt, giúp giao diện Quản lý tổ chức (`/admin/organization`) hiển thị đầy đủ badge chu kỳ đánh giá (Monthly, Quarterly, Biannually, Annually) và các mốc thời gian đánh giá (Last Review Date, Next Review Date).

Expected Behavior:
- 20 nhân viên trong database được gán đúng chu kỳ đánh giá (`MONTHLY`, `QUARTERLY`, `BIANNUALLY`, `ANNUALLY`), số tháng tương ứng (1, 3, 6, 12), thời điểm đánh giá gần nhất (`last_evaluation_completed_at`) và thời hạn đánh giá tiếp theo (`next_review_due_date`).
- Khi truy cập `/admin/organization`, cột Review Cadence hiển thị badge xanh lá chuẩn hóa (ví dụ: "Annually", "Biannually", "Quarterly", "Monthly") thay vì "Not Set".
- Cột Last Review Date và Next Review Date hiển thị định dạng chuẩn `Mon YYYY` (ví dụ: "Nov 2025", "Jul 2026", "Oct 2026", "Mar 2027") thay vì dấu gạch ngang `-`.
- Dữ liệu thêm vào được đóng gói thành script SQL/seed có tính idempotent (chạy lại an toàn không lỗi dữ liệu).

Acceptance Criteria:
1. Toàn bộ 20 nhân viên có đầy đủ dữ liệu `review_cadence`, `review_cadence_months`, `last_evaluation_completed_at`, `next_review_due_date` theo đúng bảng đã chốt.
2. Khoảng thời gian giữa `last_evaluation_completed_at` và `next_review_due_date` khớp chính xác với số tháng của `review_cadence`.
3. Giao diện frontend `/admin/organization` tải dữ liệu thành công và hiển thị đầy đủ, đẹp mắt trên cả 20 dòng nhân viên.
4. Ràng buộc dữ liệu, quan hệ khóa ngoại (Foreign Keys) và các bản ghi đánh giá hiện có trong hệ thống không bị ảnh hưởng.

Out of Scope:
- Không sửa đổi thông tin cá nhân nhân viên (mã nhân viên, họ tên, email, chức vụ, phòng ban, nhóm).
- Không sửa đổi cấu hình đợt đánh giá hiện tại (`H2-2026`).
- Không thay đổi hợp đồng API (API contract) của các module khác.

Business Rules Involved:
- Chu kỳ đánh giá hỗ trợ 4 mốc: `MONTHLY` (+1 tháng), `QUARTERLY` (+3 tháng), `BIANNUALLY` / `SEMI_ANNUAL` (+6 tháng), `ANNUALLY` / `ANNUAL` (+12 tháng).
- Ngày đến hạn (`next_review_due_date`) được tính bằng ngày hoàn thành gần nhất (`last_evaluation_completed_at`) cộng với chu kỳ tương ứng.
- Trên UI, ngày tháng được định dạng theo chuẩn `Mon YYYY`.

Open Questions / Conflicts:
- None.

## Inputs Reviewed
- User prompt requesting preview before insertion and non-repetitive varied dates
- Frontend Organization table requirements and screenshot

## Actions and Evidence
- Prepared and refined the 20-employee proposed data table with varied cadences and dates

## Changes Made
- None in this step

## Decisions and Rationale
- Spread dates across Oct 2025 – Mar 2027 to ensure realistic, diverse dashboard and table presentation

## Risks / Blockers
- None

## Next Step
- Step 2: Investigate
