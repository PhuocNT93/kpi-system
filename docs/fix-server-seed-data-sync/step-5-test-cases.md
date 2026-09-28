# Step 5: Define Test Cases

Status: reconstructed from earlier approved response

## Deliverable

## Test Cases

| ID | Description | Type | Expected Result |
|---|---|---|---|
| **TC01** | Kiểm tra gán phòng ban cho 2 Teams trong script seed | Integration | Cả 2 team `ALLEGRO-NX` và `MARITIME-SOL` đều có `department_id` trỏ đúng vào `DEPT-ENG` (Engineering). |
| **TC02** | Kiểm tra chuẩn hóa tên Team | Integration | Tên trong bảng `team` là `'ALLEGRO NX'` và `'Maritime Solutions'` (không có hậu tố `' Part'`). |
| **TC03** | Kiểm tra gán phòng ban cho 20 nhân sự thực tế | Integration | Cả 20 nhân viên (Manager + 19 members) đều có trường `department_id` trỏ chính xác về `DEPT-ENG`. |
| **TC04** | Kiểm tra dọn dẹp phòng ban rác `Solutions` | Integration | Truy vấn `SELECT * FROM department WHERE code = 'DEPT-6610'` trả về 0 bản ghi; không còn phòng ban `Solutions` dư thừa. |
| **TC05** | Kiểm tra seed công thức riêng cho `ALLEGRO-NX` | Integration | Bảng `team_evaluation_formula` có bản ghi ứng với `team_id` của `ALLEGRO-NX` với `is_custom_override = true`, 4 components và thang điểm 5.0. |
| **TC06** | Kiểm tra tự động mở rộng phòng ban Engineering ở Frontend | Unit / Component | Component `OrgStructureTab.tsx` tự động tìm ID của `DEPT-ENG` để mở rộng danh sách team mà không phụ thuộc UUID tĩnh. |
| **TC07** | Kiểm tra toàn bộ Test Suite & Lint/Typecheck | Regression | `npm test`, `npm run typecheck`, `npm run lint` trên cả Backend và Frontend đều vượt qua 100%. |

## Inputs Reviewed
- Acceptance criteria from Step 1.
- Database constraints and schema from Step 2.

## Actions and Evidence
- Mapped 7 test cases covering the entire scope of the fix.

## Changes Made
- None.

## Decisions and Rationale
- Concrete expected results ensure clear validation criteria in Step 7.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implement
