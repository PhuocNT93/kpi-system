# Step 1: Understand

Status: reconstructed from earlier approved response

## Deliverable

## Task Understanding

### Goal
Đồng bộ hóa dữ liệu giữa Local và Staging Server thông qua việc sửa đổi script seed (`seed-real-members.mjs`) và cập nhật logic mở rộng cây phòng ban ở frontend (`OrgStructureTab.tsx`). Đảm bảo khi chạy `npm run seed` trên bất kỳ môi trường nào (local hay Neon server), sơ đồ tổ chức, danh sách team, nhân viên và công thức đánh giá hoàn toàn nhất quán.

### Expected Behavior
- **Phòng ban Engineering (`DEPT-ENG`)**:
  - Chứa chính xác 2 teams: `ALLEGRO NX` (mang nhãn `CT Riêng`) và `Maritime Solutions` (mang nhãn `Mặc định`).
  - Không còn các mock teams cũ (`Backend Team`, `Frontend Team`, `DevOps Team`, v.v.).
- **Nhân sự thực tế (20 members)**:
  - Tất cả 20 nhân sự (bao gồm Manager Lương Công Kỳ và 19 thành viên) đều thuộc phòng ban `DEPT-ENG` và phân bổ chính xác vào 2 teams: `ALLEGRO NX` (11 thành viên + Manager) và `Maritime Solutions` (8 thành viên).
  - Không còn hiển thị dưới phòng ban dư thừa `Solutions`.
- **Dọn dẹp phòng ban dư thừa**:
  - Xóa bỏ phòng ban lỗi/dư thừa `DEPT-6610` (`Solutions`) khỏi database.
- **Công thức đánh giá riêng cho ALLEGRO NX**:
  - Script seed tự động khởi tạo bản ghi `team_evaluation_formula` cho team `ALLEGRO-NX` với `is_custom_override = true` để team này hiển thị đúng badge `CT Riêng` trên cả server.
- **Frontend auto-expand dynamic**:
  - `OrgStructureTab.tsx` tự động tìm và mở rộng phòng ban `DEPT-ENG` theo mã code (`dept.code === 'DEPT-ENG'`) thay vì hardcode UUID tĩnh `d1000000-0000-4000-8000-000000000001`.

### Acceptance Criteria
1. **AC1 (Gán phòng ban cho Team)**: Trong `seed-real-members.mjs`, `department_id` của 2 team `ALLEGRO-NX` và `MARITIME-SOL` được lấy trực tiếp từ `SELECT department_id FROM department WHERE code = 'DEPT-ENG'` (nếu chưa có thì tạo mới `DEPT-ENG`).
2. **AC2 (Chuẩn hóa tên Team)**: Tên của 2 team được đặt chính xác là `'ALLEGRO NX'` và `'Maritime Solutions'` (bỏ hậu tố `' Part'`).
3. **AC3 (Gán phòng ban cho Employee)**: Khi INSERT và UPDATE nhân viên trong `seed-real-members.mjs`, trường `department_id` của tất cả 20 nhân viên luôn được cập nhật về ID của `DEPT-ENG`.
4. **AC4 (Xóa phòng ban dư thừa)**: Dọn dẹp phòng ban `DEPT-6610` (`Solutions`) và bất kỳ department dư thừa nào không thuộc danh mục chuẩn của hệ thống.
5. **AC5 (Seed công thức đánh giá cho ALLEGRO NX)**: Thêm bước seed công thức riêng cho team `ALLEGRO-NX` trong `seed-real-members.mjs`, đảm bảo `is_custom_override = true`, `scale_max = 5.0` và 4 components (Performance, Core Competencies, Leadership, Compliance) khớp với local.
6. **AC6 (Dynamic Org Tree Expand)**: `OrgStructureTab.tsx` khởi tạo `expandedDepts` linh hoạt dựa trên department có code `'DEPT-ENG'`.
7. **AC7 (Kiểm tra tương thích & An toàn dữ liệu)**: Chạy `npm run seed` thành công không phát sinh lỗi khóa ngoại (Foreign Key). Các unit/integration tests backend và frontend typecheck/lint đều vượt qua.

### Out of Scope
- Chỉnh sửa logic tính điểm hay bộ thu thập Jira Collector.
- Can thiệp vào các bảng hệ thống IAM / Authentication ngoài các tài khoản seed thực tế.

### Business Rules Involved
- **Toàn vẹn khóa ngoại (Referential Integrity)**: Khi xóa department hoặc team cũ, phải remap hoặc NULL out foreign key của `employee`, `employee_assignment`, `team_evaluation_formula` trước để không vi phạm ràng buộc RESTRICT/CASCADE.
- **Phân cấp kế thừa công thức (LLD Evaluation Formula Hierarchy)**: Team kế thừa công thức từ Department hoặc Global trừ khi có bản ghi riêng với `is_custom_override = true`.

### Open Questions / Conflicts
- None.

## Inputs Reviewed
- Screenshots comparing localhost:5173 and staging server
- Backend seed scripts and migrations
- Live response of staging endpoints

## Actions and Evidence
- Compared local DB vs Neon remote DB: confirmed team assignment to `DEPT-BOD` on remote, employees assigned to `DEPT-6610`, and missing custom formula.

## Changes Made
- None.

## Decisions and Rationale
- Clarified all requirements before implementation.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
