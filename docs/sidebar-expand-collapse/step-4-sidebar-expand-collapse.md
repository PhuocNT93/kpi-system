# Step 4: Plan

Status: produced during this step

## Objective
Lập kế hoạch hoàn chỉnh cho việc nâng cấp và tinh chỉnh Sidebar.

## Inputs Reviewed
- `frontend/src/shared/layout/Sidebar.tsx`
- `frontend/src/shared/layout/AppLayout.tsx`

## Actions and Evidence
1. **Sidebar Component:**
   - Props: `collapsed`, `defaultCollapsed`, `onToggleCollapse`.
   - Header: Logo height 36px + Nút Toggle `<` (28x28px). Khi Collapsed: Nút `>` (36x36px) ở giữa.
   - Menu items: Icon 32x32px, text nhãn hiển thị trọn vẹn ở 280px, tooltip khi 72px.
   - Action buttons: Generate Report và Help Center thích ứng 2 trạng thái.
   - Transition: CSS hardware-accelerated cubic-bezier mượt mà.
2. **AppLayout Component:**
   - Chuyển tiếp các props liên quan xuống `Sidebar`.

## Changes Made
- Không có code changes.

## Decisions and Rationale
- Đảm bảo tính thẩm mỹ, dễ mở rộng và dễ bảo trì.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases.
