# Step 3: Impact Analysis

Status: reconstructed from earlier approved response

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | LOW | Cập nhật khởi tạo `expandedDepts` trong `OrgStructureTab.tsx` để mở rộng theo `dept.code === 'DEPT-ENG'` thay vì UUID hardcode. Giao diện và API client không thay đổi. |
| Backend | LOW | Sửa script seed `seed-real-members.mjs` và `organization.seed.ts`. Không can thiệp API routes hay domain logic. |
| Database | MEDIUM | Cập nhật quan hệ dữ liệu: gán `department_id` của 2 team và 20 nhân viên về `DEPT-ENG`; dọn dẹp phòng ban rác `DEPT-6610` (`Solutions`); upsert công thức riêng cho `ALLEGRO-NX` vào `team_evaluation_formula`. |
| API | NONE | Giữ nguyên 100% hợp đồng API (`/api/org/departments`, `/api/teams`, `/api/employees`, `/api/org/formula/summary`). |
| RBAC / Scope | NONE | Quyền hạn người dùng và nhóm quyền không thay đổi. |
| Workflow | NONE | Chu trình đánh giá và luồng duyệt KPI giữ nguyên. |
| Audit | NONE | Script seed chạy TRUNCATE bypass trigger append-only theo thứ tự ràng buộc. |
| Concurrency | NONE | Script seed chạy tuần tự trong Database Transaction (`BEGIN ... COMMIT`). |
| Performance | NONE | Khối lượng dữ liệu nhỏ (2 teams, 20 nhân sự, 1 công thức), thời gian chạy < 1 giây. |
| Historical Data | LOW | Remap toàn bộ dữ liệu nhân viên từ `DEPT-6610` sang `DEPT-ENG` trước khi xóa department rác để bảo toàn lịch sử. |

### Potential Risks
- **Lỗi Foreign Key khi xóa `DEPT-6610`**: Nếu còn bất kỳ bản ghi `employee` hoặc `employee_assignment` nào trỏ tới `DEPT-6610`, lệnh `DELETE FROM department` sẽ bị chặn.  
  *Giải pháp*: Chạy lệnh `UPDATE employee SET department_id = $1 WHERE department_id IN (...)` và tương tự cho `employee_assignment` trước khi `DELETE`.
- **Lỗi trùng lặp khi chạy lại seed nhiều lần (Idempotency)**:  
  *Giải pháp*: Dùng `ON CONFLICT (team_id) DO UPDATE` cho `team_evaluation_formula` và `ON CONFLICT (code) DO UPDATE` cho `team`.

### Required ADR / Clarification
- None.

## Inputs Reviewed
- Database foreign keys linking to `department` and `team`.

## Actions and Evidence
- Verified existence of `employee_assignment.department_id` and `employee.department_id` foreign keys.

## Changes Made
- None.

## Decisions and Rationale
- Remap before delete pattern ensures safe foreign key transition.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
