# Step 5: Define Test Cases

Status: produced during this step

## Objective
Xác định toàn diện các ca kiểm thử chức năng và giao diện cho Sidebar.

## Inputs Reviewed
- Các tương tác thực tế của người dùng trên Sidebar.

## Actions and Evidence
| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Toggle Collapse Sidebar | Đang mở rộng (280px) | Click nút `<` | Sidebar co lại về 72px mượt mà, icon căn giữa, logo thu gọn |
| TC02 | Tooltip khi hover (Collapsed) | Đang thu gọn (72px) | Rê chuột vào icon menu | Hiển thị tooltip tên menu, hover background đúng màu |
| TC03 | Toggle Expand Sidebar | Đang thu gọn (72px) | Click nút `>` | Sidebar mở rộng về 280px, hiển thị đầy đủ logo và text |
| TC04 | Text hiển thị không bị cắt | Đang mở rộng (280px) | Quan sát "Evaluation Configuration" | Dòng chữ hiển thị đầy đủ, không bị `...` |
| TC05 | Click Action Buttons | Cả 2 trạng thái | Click Generate Report / Help Center | Kích hoạt callback chính xác |
| TC06 | TypeScript & Build | Code hoàn tất | Chạy `typecheck` và `build` | Hoàn tất không có lỗi |

## Changes Made
- Không có code changes.

## Decisions and Rationale
- Đảm bảo kiểm tra đầy đủ cả chức năng và giao diện.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implement.
