# Step 4: Plan

Status: reconstructed from earlier approved response

## Deliverable

## Implementation Plan

1. **What:** Chuẩn hóa tìm kiếm department và tên team trong script seed.
   - **Where:** `backend/src/modules/configuration/infrastructure/seed/seed-real-members.mjs`
   - **Why:** Thay thế `SELECT department_id FROM department LIMIT 1` bằng truy vấn chuẩn theo `code = 'DEPT-ENG'`. Đồng thời chuẩn hóa tên 2 team thành `'ALLEGRO NX'` và `'Maritime Solutions'` và cập nhật `department_id` của 2 team về `DEPT-ENG`.
   - **Tests:** Chạy `node src/modules/configuration/infrastructure/seed/seed-real-members.mjs` kiểm tra 2 team thuộc `DEPT-ENG`.

2. **What:** Cập nhật `department_id` cho 20 nhân viên và dọn dẹp phòng ban rác `Solutions` (`DEPT-6610`).
   - **Where:** `backend/src/modules/configuration/infrastructure/seed/seed-real-members.mjs`
   - **Why:** Bổ sung trường `department_id` khi INSERT/UPDATE vào bảng `employee` cho cả 20 nhân sự (Manager + 19 members). Cập nhật các bản ghi liên quan và xóa phòng ban dư thừa `DEPT-6610`.
   - **Tests:** Kiểm tra toàn bộ 20 nhân viên có `department_id` trùng với ID của `DEPT-ENG`, không còn phòng ban `DEPT-6610`.

3. **What:** Seed công thức đánh giá riêng cho team `ALLEGRO NX` (`is_custom_override: true`).
   - **Where:** `backend/src/modules/configuration/infrastructure/seed/seed-real-members.mjs`
   - **Why:** Thêm bản ghi `team_evaluation_formula` cho team `ALLEGRO-NX` với 4 components (Performance 60%, Capability 5%, Contribution 15%, Behavior 20%) và thang điểm 5.0 để team hiển thị huy hiệu `CT Riêng` trên cả server.
   - **Tests:** Kiểm tra endpoint `/api/org/formula/summary` trả về `is_custom_override: true` cho `ALLEGRO-NX`.

4. **What:** Cập nhật teams dưới Engineering trong `organization.seed.ts`.
   - **Where:** `backend/src/modules/organization/infrastructure/seed/organization.seed.ts`
   - **Why:** Đảm bảo khi chạy `npm run seed:iam` độc lập, hệ thống seed 2 team chuẩn (`ALLEGRO-NX`, `MARITIME-SOL`) thay vì tạo lại 7 mock teams cũ (`TEAM-BACKEND`, `TEAM-FRONTEND`, v.v.).
   - **Tests:** `npm test` backend.

5. **What:** Mở rộng linh hoạt nhánh phòng ban Engineering trên Organization Tree.
   - **Where:** `frontend/src/features/organization/components/OrgStructureTab.tsx`
   - **Why:** Bỏ hardcode UUID `d1000000-0000-4000-8000-000000000001`, tự động tìm `department_id` của phòng ban có `code === 'DEPT-ENG'` từ danh sách tải về để mở rộng.
   - **Tests:** `npm run typecheck`, `npm run lint` frontend.

## Inputs Reviewed
- Implementation details of `seed-real-members.mjs`, `organization.seed.ts`, and `OrgStructureTab.tsx`.

## Actions and Evidence
- Structured a 5-step concrete, minimal plan covering seed scripts and frontend auto-expand.

## Changes Made
- None.

## Decisions and Rationale
- Fixes address all 5 root causes identified in Step 2.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases
