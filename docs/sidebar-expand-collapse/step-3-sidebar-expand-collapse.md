# Step 3: Impact Analysis

Status: produced during this step

## Objective
Đánh giá mức độ ảnh hưởng của tính năng Sidebar Expand / Collapse và thay đổi tỷ lệ hiển thị.

## Inputs Reviewed
- Bố cục toàn cục của `AppLayout.tsx`.

## Actions and Evidence
- Đảm bảo `AppLayout` với `flex: 1` thích ứng mượt mà khi Sidebar thay đổi chiều rộng từ 280px về 72px. Không ảnh hưởng API, backend, DB hay phân quyền.

## Changes Made
- Không có code changes.

## Decisions and Rationale
- Rủi ro thấp, tương thích ngược 100%.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan.
