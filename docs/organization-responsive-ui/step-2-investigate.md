# Step 2: Investigate

Status: reconstructed from approved response

## Deliverable

## Findings

- File: `frontend/src/features/organization/pages/OrganizationPage.tsx` (lines 30-60) - Thẻ `<main>` có padding cố định 12px, tab button hàng ngang chưa có touch-scrolling.
- File: `frontend/src/features/organization/components/JobArchitectureTab.tsx` (lines 33-101) - Điểm nghẽn `minmax(600px, 1fr)` gây vỡ màn hình mobile và tablet hẹp.
- File: `frontend/src/features/organization/components/OrgStructureTab.tsx` (lines 53-185) - Điểm nghẽn sidebar 300px cố định đặt ngang bên cạnh bảng gây ép nghẽn dữ liệu trên `< 1024px`.
- File: Data Tables (`JobLevelTable.tsx`, `OrgRoleTable.tsx`, `ReviewCadenceTable.tsx`, `DepartmentTable.tsx`, `TeamTable.tsx`, `EmployeeTable.tsx`) - Cần `minWidth` và `WebkitOverflowScrolling: 'touch'`.
- File: Form Modals (`ReviewCadenceFormModal.tsx`, `JobLevelFormModal.tsx`, `OrgRoleFormModal.tsx`, `DepartmentFormModal.tsx`, `TeamFormModal.tsx`, `EmployeeFormModal.tsx`) - Cần giới hạn `maxHeight: '90vh'` và `overflowY: 'auto'`.
- File: `frontend/src/index.css` (lines 135-210) - Đã có utility responsive chung, cần bổ sung scoped utility cho Organization.

## Constraints Discovered

- Vanilla CSS & Design Tokens đồng bộ với Theme.
- Ngăn chặn iOS Safari tự động zoom input khi focus bằng cách đảm bảo font-size 16px trên di động.
- Bảo toàn 100% logic CRUD, RBAC, Dark Mode và i18n.

## Ambiguities / Gaps Identified

- Không có sự mơ hồ. Breakpoints: Desktop $\ge 1024\text{px}$, Tablet $768\text{px} - 1023\text{px}$, Mobile $< 768\text{px}$.
