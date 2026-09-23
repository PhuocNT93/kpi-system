# Step 6: Implementation

Status: produced during this step

## Deliverable

## Implementation Summary

- Files created:
  - `docs/organization-responsive-ui/step-0-sync-and-branch.md`
  - `docs/organization-responsive-ui/step-1-understand.md`
  - `docs/organization-responsive-ui/step-2-investigate.md`
  - `docs/organization-responsive-ui/step-3-impact-analysis.md`
  - `docs/organization-responsive-ui/step-4-plan.md`
  - `docs/organization-responsive-ui/step-5-test-cases.md`
  - `docs/organization-responsive-ui/step-6-implementation.md`
- Files modified:
  - `frontend/src/index.css`: Bổ sung responsive classes scoped cho Organization (`.org-page-container`, `.org-tabs-bar`, `.org-job-grid`, `.org-structure-layout`, `.org-tree-sidebar`, `.org-content-panel`, `.org-card`, `.org-modal-overlay`, `.org-modal-card`, `.org-form-input`).
  - `frontend/src/features/organization/pages/OrganizationPage.tsx`: Tích hợp responsive container padding và scrollable tab bar, touch target $\ge 40\text{px}$.
  - `frontend/src/features/organization/components/JobArchitectureTab.tsx`: Thay thế `minmax(600px, 1fr)` bằng `.org-job-grid` (1 cột trên mobile, 2 cột trên desktop).
  - `frontend/src/features/organization/components/OrgStructureTab.tsx`: Chuyển sang `.org-structure-layout` (xếp chồng dọc trên `< 1024px`, 2 cột trên `\ge 1024px`).
  - `frontend/src/features/organization/components/JobLevelTable.tsx`: Thiết lập touch scroll và `minWidth: 600px`.
  - `frontend/src/features/organization/components/OrgRoleTable.tsx`: Thiết lập touch scroll và `minWidth: 540px`.
  - `frontend/src/features/organization/components/ReviewCadenceTable.tsx`: Thiết lập touch scroll và `minWidth: 640px`.
  - `frontend/src/features/organization/components/DepartmentTable.tsx`: Thiết lập touch scroll và `minWidth: 540px`.
  - `frontend/src/features/organization/components/TeamTable.tsx`: Thiết lập touch scroll và `minWidth: 580px`.
  - `frontend/src/features/organization/components/EmployeeTable.tsx`: Thiết lập touch scroll và `minWidth: 850px`.
  - `frontend/src/features/organization/components/ReviewCadenceFormModal.tsx`: Sử dụng `.org-modal-overlay` và `.org-modal-card` (`max-height: 90vh; overflow-y: auto`).
  - `frontend/src/features/organization/components/JobLevelFormModal.tsx`: Sử dụng `.org-modal-overlay` và `.org-modal-card`.
  - `frontend/src/features/organization/components/OrgRoleFormModal.tsx`: Sử dụng `.org-modal-overlay` và `.org-modal-card`.
  - `frontend/src/features/organization/components/DepartmentFormModal.tsx`: Sử dụng `.org-modal-overlay` và `.org-modal-card`.
  - `frontend/src/features/organization/components/TeamFormModal.tsx`: Sử dụng `.org-modal-overlay` và `.org-modal-card`.
  - `frontend/src/features/organization/components/EmployeeFormModal.tsx`: Sử dụng `.org-modal-overlay`, `.org-modal-card` và Dark Mode theme.
- Key decisions made:
  - Áp dụng các breakpoint tiêu chuẩn: Desktop $\ge 1024\text{px}$, Tablet $768\text{px} - 1023\text{px}$, Mobile $< 768\text{px}$.
  - Giữ lại 100% mã nguồn sạch, Vanilla CSS và Design Tokens đồng nhất không sử dụng Tailwind CSS.
  - Form modals luôn có chiều cao tối đa 90vh và cuộn dọc để nút bấm không bao giờ bị tràn khuất khi bàn phím ảo hiển thị.

## Actions and Evidence

- Lệnh `npm run build` chạy thành công không có lỗi: `tsc --noEmit` và `vite build` vượt qua 100% trong 14.47s.
