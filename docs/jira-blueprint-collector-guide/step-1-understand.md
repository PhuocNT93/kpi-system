# Step 1: Understand

Status: reconstructed from earlier approved response

## Deliverable

## Task Understanding

### Goal
Soạn thảo tài liệu kỹ thuật toàn diện và chuẩn mực `docs/JIRA_BLUEPRINT_COLLECTOR_AND_SCORING_GUIDE.md` trình bày chi tiết kiến trúc, phương thức thu thập dữ liệu (Jira & Blueprint CLV) và toàn bộ thuật toán/cơ chế tính điểm KPI của hệ thống.

### Expected Behavior
1. Kiến trúc Thu thập Jira: Luồng JQL dynamic query, phân giải đa tài khoản định danh, khung thời gian cá nhân hóa theo chu kỳ review.
2. Kiến trúc Thu thập Blueprint CLV: Chuyên cần UI_TAT_028 đa bộ phận, tasks UI_PIM_001, thuật toán khử trùng lặp ngày công in-memory.
3. Mô hình Thuật toán Tính điểm KPI: Rubric chuẩn 5 tiêu chí, mô hình Penalty từ mốc 100 điểm, 3 mức độ nghiêm ngặt AI (Dễ/Vừa/Khó), nguyên tắc Infraction Ceiling, điều kiện Mức 5 (Xuất sắc), và blending 50/50.

### Acceptance Criteria
1. Tài liệu markdown đầy đủ, có cấu trúc rõ ràng, sử dụng Mermaid diagrams trực quan hóa pipeline thu thập và chấm điểm.
2. Bảng công thức toán học chi tiết cho từng loại trừ điểm và cộng thưởng.
3. Bảng đối chiếu tham số giữa 3 cấp độ nghiêm ngặt (EASY, MEDIUM, HARD).
4. Bảng minh họa tính điểm cho các case điển hình.
5. File được lưu cố định vào thư mục `docs/`.

### Out of Scope
- Không can thiệp sửa đổi logic mã nguồn runtime của backend/frontend.

### Business Rules Involved
- BR-COLLECT-01, BR-COLLECT-02, BR-ATTENDANCE-01, BR-SCORE-01 (Infraction Ceiling), BR-SCORE-02 (Level 5), BR-BLEND-01.

### Open Questions / Conflicts
- Không có.

## Next Step
- Step 2: Investigate
