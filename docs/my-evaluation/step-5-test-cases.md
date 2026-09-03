# Step 5: Define Test Cases

Status: reconstructed from approved response

## Deliverable

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Hiển thị danh sách My Evaluation khi có active cycle | Employee đã đăng nhập và có evaluation ở cycle hiện tại | Mở trang `/admin/my-evaluations` | Thẻ Active Evaluation hiển thị tên cycle, thời gian, trạng thái (`OPEN` / `SELF_ASSESSMENT`), thanh tiến độ `completed_items / active_items` và nút CTA `Continue` / `Start Self-Assessment`. |
| TC02 | Hiển thị danh sách rỗng (Empty State) | Employee chưa được gán bất kỳ evaluation nào | Mở trang `/admin/my-evaluations` | Hiển thị màn hình thông báo Empty State rõ ràng ("No evaluations found"), không có lỗi crash hay gọi API ID không hợp lệ. |
| TC03 | Bảng lịch sử các kỳ đánh giá trước | Employee có các evaluation ở các cycle đã qua (`APPROVED`, `PUBLISHED`, `LOCKED`) | Xem phần Evaluation History trên trang `/admin/my-evaluations` | Hiển thị danh sách lịch sử kèm trạng thái, thời gian; chỉ hiển thị `Final Score` khi evaluation đã ở trạng thái `PUBLISHED` hoặc được phép. |
| TC04 | Hiển thị chi tiết evaluation với dữ liệu từ snapshot | Evaluation đang ở trạng thái `OPEN` / `SELF_ASSESSMENT` | Mở trang `/admin/my-evaluations/:id` | Header hiển thị breadcrumbs, status badge, progress indicator; các tiêu chí hiển thị đúng category, tên, mô tả, weight, rule type và danh sách level lấy từ snapshot. |
| TC05 | Xử lý tiêu chí bị vô hiệu hóa (`is_disabled_for_employee=true`) | Có ít nhất 1 tiêu chí được đánh dấu `is_disabled_for_employee=true` | Xem danh sách tiêu chí và thanh tiến độ | Tiêu chí bị disable hiển thị trạng thái disabled/không bắt buộc nhập và tự động loại khỏi mẫu số tính progress. |
| TC06 | Chọn level và nhập comment cho tiêu chí | Evaluation ở trạng thái `OPEN` / `SELF_ASSESSMENT` | Click chọn một level trong danh sách options và nhập nội dung vào ô comment | UI cập nhật lựa chọn level, hiển thị trạng thái dirty/unsaved và điểm tương ứng của level được chọn. |
| TC07 | Lưu nháp thành công (`Save Draft`) | Người dùng đã nhập/chỉnh sửa level hoặc comment trên form | Click nút "Save Draft" | Gửi payload cập nhật lên API (`PUT /api/v1/evaluations/:id/items`), hiển thị thông báo "Draft saved successfully", xóa dirty state và cập nhật cache query. |
| TC08 | Cảnh báo khi nộp thiếu tiêu chí bắt buộc | Còn ít nhất 1 tiêu chí active chưa được chọn level | Click nút "Submit Self-Assessment" | Hiển thị cảnh báo danh sách tiêu chí còn thiếu và yêu cầu hoàn thành trước khi submit. |
| TC09 | Nộp Self-Assessment thành công qua Confirmation Modal | Tất cả tiêu chí active đã được chọn level và nhập thông tin | Click "Submit Self-Assessment" -> Hiện Confirmation Modal -> Xác nhận Submit | Gửi request `POST /api/v1/evaluations/:id/self-submit` với header Idempotency, hiển thị thông báo thành công, refetch và cập nhật giao diện sang trạng thái `SUBMITTED` / `MANAGER_ASSESSMENT` (Read-only). |
| TC10 | Chống double-submit khi đang nộp | Đang trong quá trình gửi request submit | Click liên tục vào nút xác nhận nộp | Nút submit bị disable ngay lập tức với loading spinner, ngăn chặn gửi nhiều request trùng lặp. |
| TC11 | Trạng thái Read-only khi evaluation đã nộp hoặc bị khóa | Evaluation ở trạng thái `SUBMITTED`, `APPROVED`, `PUBLISHED` hoặc `LOCKED` | Mở trang chi tiết evaluation | Hiển thị ReadOnlyBanner giải thích lý do; tất cả các control chọn level, ô nhập comment/evidence và nút Save/Submit đều bị vô hiệu hóa (disabled). |
| TC12 | Cảnh báo Unsaved Changes khi rời trang | Đang có thay đổi dữ liệu chưa bấm "Save Draft" | Thử reload trang, bấm nút Back hoặc chuyển sang trang khác | Hiển thị hộp thoại cảnh báo người dùng có dữ liệu chưa lưu để tránh mất mát dữ liệu. |
| TC13 | Phân quyền truy cập (Scoping & RBAC) | User thử truy cập vào ID evaluation của một nhân viên khác | Gọi `GET /api/v1/evaluations/:other_id` hoặc mở URL tương ứng | Backend trả về lỗi `403 FORBIDDEN` và Frontend hiển thị thông báo không có quyền truy cập, không làm lộ dữ liệu của người khác. |
| TC14 | Không hiển thị thông tin ranking hay peer comparison | Bất kỳ màn hình nào của My Evaluation | Kiểm tra toàn bộ UI elements và dữ liệu hiển thị | Tuyệt đối không xuất hiện cột, biểu đồ hay chỉ số ranking, percentile, top-X% hay so sánh với đồng nghiệp. |

## Next Step
- Step 6: Implement
