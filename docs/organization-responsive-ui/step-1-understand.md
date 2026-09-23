# Step 1: Understand

Status: reconstructed from approved response

## Deliverable

## Task Understanding

### Goal
Xây dựng và tối ưu giao diện đáp ứng (Responsive Design) linh hoạt trên đa dạng kích thước thiết bị (Desktop, Laptop, Tablet, Mobile) cho toàn bộ phân hệ **Organization Management** (`/admin/organization`), bao gồm tab **Job Architecture**, tab **Org Structure**, các bảng dữ liệu danh mục và hệ thống Form Modals.

### Expected Behavior
1. **Trang chính & Tab Navigation (`OrganizationPage.tsx`)**: Header và thanh chuyển Tab tự động wrap hoặc co giãn linh hoạt khi xem trên màn hình nhỏ (< 640px), không làm xuất hiện thanh cuộn ngang ngoài ý muốn ở cấp viewport (`overflow-x: hidden`).
2. **Tab Cấu trúc Vị trí (`JobArchitectureTab.tsx`)**:
   - Desktop (> 1024px): Lưới 2 hoặc 3 cột hiển thị song song các khối Job Roles, Job Levels, Review Cadences.
   - Tablet (768px - 1024px): Tự động điều chỉnh co giãn lưới theo tỷ lệ màn hình.
   - Mobile (< 768px): Tự động xếp chồng thành 1 cột dọc (`grid-template-columns: 1fr`), khoảng cách và padding căn chỉnh gọn gàng (12px - 16px).
3. **Tab Cơ cấu Tổ chức (`OrgStructureTab.tsx`)**:
   - Desktop (> 1024px): Cấu trúc 2 cột song song (Sidebar cây sơ đồ 300px + Panel dữ liệu chi tiết co giãn bên phải).
   - Tablet / Mobile (< 1024px): Bố cục tự động chuyển sang xếp chồng theo chiều dọc (`flex-direction: column`), thanh điều hướng sơ đồ phòng ban đặt phía trên gọn gàng, khu vực bảng hiển thị đầy đủ bên dưới.
4. **Bảng dữ liệu (`JobLevelTable`, `OrgRoleTable`, `ReviewCadenceTable`, `DepartmentTable`, `TeamTable`, `EmployeeTable`)**: Bọc trong container có cuộn ngang độc lập mượt mà (`overflow-x: auto`), bảo toàn độ rộng cột không bị méo mó.
5. **Hệ thống Dialog / Form Modals**: Modal tự động thích ứng với chiều rộng màn hình: `width: 95%`, `max-width: 520px`, `max-height: 90vh` kèm thanh cuộn dọc nội dung khi bàn phím ảo bật lên trên thiết bị di động.

### Acceptance Criteria
- **AC1**: Giao diện không bị vỡ bố cục, không tràn ngang trang (no horizontal page scrollbar) trên các độ phân giải tiêu chuẩn: Desktop (1440px / 1280px), Tablet (1024px / 768px), Mobile (414px / 390px / 360px).
- **AC2**: Khối card trong `JobArchitectureTab` chuyển đổi mượt mà giữa Grid đa cột (Desktop) và 1 cột (Mobile).
- **AC3**: Cây sơ đồ tổ chức và khung bảng trong `OrgStructureTab` tự động chuyển từ hàng ngang sang xếp chồng dọc khi bề rộng < 1024px.
- **AC4**: Tất cả các bảng danh mục đều có thể vuốt/cuộn ngang độc lập mà không làm lệch card bao ngoài.
- **AC5**: Toàn bộ modal forms vừa vặn với viewport thiết bị, các nút bấm "Hủy", "Lưu thay đổi" hiển thị rõ ràng và bấm thuận tiện trên màn hình cảm ứng.
- **AC6**: Giữ vững 100% tính năng Dark Mode và hỗ trợ đa ngôn ngữ i18n (`ORGANIZATION_UI`).

### Out of Scope
- Không can thiệp vào các API, Database migration hoặc backend logic nghiệp vụ.
- Không thay đổi layout của các phân hệ khác ngoài `/admin/organization`.

### Business Rules Involved
- Quyền hiển thị theo Role (HR_ADMIN / SYSTEM_ADMIN được xem và thao tác thêm/sửa/xóa, các role khác tuân thủ phân quyền).
- Màu sắc và phong cách thiết kế bám sát Design System hiện tại của hệ thống.

### Open Questions / Conflicts
- Không có xung đột kỹ thuật.
