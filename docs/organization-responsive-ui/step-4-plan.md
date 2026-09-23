# Step 4: Plan

Status: reconstructed from approved response

## Deliverable

## Implementation Plan

1. Bổ sung Scoped Responsive CSS Classes vào `frontend/src/index.css` (`.org-tabs-bar`, `.org-job-grid`, `.org-structure-layout`, `.org-tree-sidebar`, `.org-card`, `.org-modal-overlay`, `.org-modal-card`, `.org-form-input`).
2. Cập nhật `OrganizationPage.tsx`: áp dụng responsive container padding và tab bar touch target.
3. Cập nhật `JobArchitectureTab.tsx`: loại bỏ `minmax(600px, 1fr)`, áp dụng responsive grid.
4. Cập nhật `OrgStructureTab.tsx`: áp dụng responsive layout theo chiều dọc khi màn hình < 1024px.
5. Cập nhật các bảng dữ liệu (`JobLevelTable`, `OrgRoleTable`, `ReviewCadenceTable`, `DepartmentTable`, `TeamTable`, `EmployeeTable`): gán `minWidth` chuẩn và touch scrolling.
6. Cập nhật các Form Modals: giới hạn `maxHeight: '90vh'`, `overflowY: 'auto'`, font-size input chống auto-zoom.
7. Kiểm thử và Kiểm tra Build: thực thi `npm run build` và test suite.

## Files to Modify / Create

- `frontend/src/index.css`: Bổ sung responsive classes cho Organization.
- `frontend/src/features/organization/pages/OrganizationPage.tsx`: Áp dụng responsive layout và tab bar.
- `frontend/src/features/organization/components/JobArchitectureTab.tsx`: Thay `minmax(600px, 1fr)` bằng responsive grid.
- `frontend/src/features/organization/components/OrgStructureTab.tsx`: Responsive layout flex direction cho tree và panel.
- `frontend/src/features/organization/components/ReviewCadenceTable.tsx`: Min-width và touch scroll.
- `frontend/src/features/organization/components/JobLevelTable.tsx`: Min-width và touch scroll.
- `frontend/src/features/organization/components/OrgRoleTable.tsx`: Min-width và touch scroll.
- `frontend/src/features/organization/components/DepartmentTable.tsx`: Min-width và touch scroll.
- `frontend/src/features/organization/components/TeamTable.tsx`: Min-width và touch scroll.
- `frontend/src/features/organization/components/EmployeeTable.tsx`: Min-width và touch scroll.
- `frontend/src/features/organization/components/ReviewCadenceFormModal.tsx`: Modal max-height 90vh, overflow scroll.
- `frontend/src/features/organization/components/JobLevelFormModal.tsx`: Modal max-height 90vh, overflow scroll.
- `frontend/src/features/organization/components/OrgRoleFormModal.tsx`: Modal max-height 90vh, overflow scroll.
- `frontend/src/features/organization/components/DepartmentFormModal.tsx`: Modal max-height 90vh, overflow scroll.
- `frontend/src/features/organization/components/TeamFormModal.tsx`: Modal max-height 90vh, overflow scroll.
- `frontend/src/features/organization/components/EmployeeFormModal.tsx`: Modal max-height 90vh, overflow scroll.
