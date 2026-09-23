# Step 3: Impact Analysis

Status: reconstructed from approved response

## Deliverable

## Impact Analysis

| Area | Impact Level | Description / Mitigation |
|---|---|---|
| **Frontend Layout (`OrganizationPage.tsx`, `JobArchitectureTab.tsx`, `OrgStructureTab.tsx`)** | **Medium** | Thay đổi cơ chế layout từ hardcoded width sang Responsive Grid và Flexbox hướng động theo breakpoint. Giữ nguyên giao diện Desktop, tối ưu Tablet và Mobile. |
| **Bảng dữ liệu (`JobLevelTable`, `OrgRoleTable`, `ReviewCadenceTable`, `DepartmentTable`, `TeamTable`, `EmployeeTable`)** | **Low** | Bọc bảng trong wrapper cuộn ngang cảm ứng (`-webkit-overflow-scrolling: touch`), thiết lập `min-width` bảng. |
| **Hệ thống Form Modals (`ReviewCadenceFormModal`, `JobLevelFormModal`, `OrgRoleFormModal`, `DepartmentFormModal`, `TeamFormModal`, `EmployeeFormModal`)** | **Low** | Bổ sung giới hạn `maxHeight: '90vh'`, `overflowY: 'auto'`, font-size 16px cho input trên mobile. Giữ nguyên toàn bộ logic form và validation Zod. |
| **CSS toàn cục (`frontend/src/index.css`)** | **Low** | Bổ sung các CSS utility classes có scope riêng cho phân hệ Organization. |
| **Backend APIs, DB Schema & Migrations** | **None** | Không có bất kỳ thay đổi nào đối với backend, database hay API contracts. |
| **Kiểm thử tự động (Unit & Integration Tests)** | **None** | Toàn bộ 655 backend tests và frontend TypeScript typecheck không bị ảnh hưởng. |

Risk Assessment:
- Rủi ro vỡ layout trên Desktop: Thấp.
- Rủi ro tràn chữ / che nút bấm trên thiết bị nhỏ (< 360px): Thấp.

Need for ADR: No.
