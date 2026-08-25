# Step 1: Understand

Status: produced during this step

## Objective
Xác định đầy đủ yêu cầu cho tính năng Expand / Collapse và chuẩn hóa tỷ lệ hiển thị của Sidebar.

## Inputs Reviewed
- `frontend/src/shared/layout/Sidebar.tsx`
- `frontend/src/shared/layout/AppLayout.tsx`
- `docs/FRONTEND_REACT_RULES.md`
- Phản hồi thực tế về kích thước logo và text menu

## Actions and Evidence
- Yêu cầu chức năng:
  1. Hỗ trợ Toggle giữa 2 trạng thái: Expanded (280px) và Collapsed (72px).
  2. Logo header hiển thị gọn gàng, thanh thoát (chiều cao 36px), đặt thẳng hàng với nút Toggle `<`.
  3. Menu items hiển thị icon căn giữa khi Collapsed (kèm tooltip native `title`), hiển thị đầy đủ text không bị cắt `...` khi Expanded.
  4. Nút `+ Generate Report` và `Help Center` tự động thích ứng tỷ lệ cân đối ở cả 2 trạng thái.

## Changes Made
- Không có code changes.

## Decisions and Rationale
- Đảm bảo trải nghiệm trực quan theo chuẩn SaaS Dashboard hiện đại.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate.
