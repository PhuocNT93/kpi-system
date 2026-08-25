# Step 6: Implement

Status: produced during this step

## Objective
Định nghĩa đầy đủ bộ Menu Navigation Items trên Sidebar tương ứng với 16 màn hình (UI/Screens) và các phân hệ của dự án theo LLD & Frontend Rules.

## Inputs Reviewed
- `docs/FRONTEND_REACT_RULES.md` (Mục 6: Required screens and workflows)
- `docs/LLD_Employee_Performance_Evaluation_System.md` (Mục 5 & Mục 31)
- `frontend/src/shared/layout/Sidebar.tsx`

## Actions and Evidence
- Cấu trúc lại danh mục menu theo 3 phân nhóm chức năng trực quan:
  1. **Overview:** `Dashboard` (Icon: `LayoutDashboard`)
  2. **Configuration (Cấu hình & Quản trị):**
     - `Employees` (Icon: `Users`)
     - `Evaluation Cycles` (Icon: `CalendarRange`)
     - `Criteria & Rules` (Icon: `SlidersHorizontal`)
     - `Template Builder` (Icon: `LayoutTemplate`)
     - `Import Center` (Icon: `FileSpreadsheet`)
     - `Audit Log` (Icon: `ShieldCheck`)
  3. **Performance (Đánh giá & Phê duyệt):**
     - `Team Reviews` (Icon: `UserCheck`)
     - `My Evaluation` (Icon: `ClipboardCheck`)
- Bổ sung section header cho từng nhóm khi Expanded và đường phân cách khi Collapsed.
- Cấu hình thanh cuộn mượt mà `overflowY: 'auto'` để đảm bảo hiển thị hoàn hảo trên mọi kích thước màn hình.

## Changes Made
- `frontend/src/shared/layout/Sidebar.tsx`
- `docs/sidebar-expand-collapse/frontend-user-guide.md`

## Decisions and Rationale
- Cung cấp trải nghiệm điều hướng chuyên nghiệp, khoa học và đầy đủ theo phạm vi dự án.

## Risks / Blockers
- None.

## Next Step
- Step 7: Test.
