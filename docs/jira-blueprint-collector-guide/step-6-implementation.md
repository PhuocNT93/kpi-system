# Step 6: Implementation

Status: produced during this step

## Deliverable

## Implementation

Changes Made:
- `docs/JIRA_BLUEPRINT_COLLECTOR_AND_SCORING_GUIDE.md`:
  - Khởi tạo tài liệu đặc tả toàn diện bao gồm 5 chương chi tiết:
    1. Tổng quan Kiến trúc Thu thập & Chấm điểm Tự động (Mermaid pipeline diagram).
    2. Cơ chế Thu thập Dữ liệu từ Jira (Jira Crawler): khung thời gian review window, đa định danh Jira, JQL động, metrics aggregation.
    3. Cơ chế Thu thập Dữ liệu từ Blueprint CLV: UI_TAT_028 chấm công đa bộ phận, UI_PIM_001 task, thuật toán khử trùng lặp ngày công in-memory, khống chế trần chuyên cần Level 4 khi có đi trễ.
    4. Thuật toán & Cơ chế Tính điểm KPI (Scoring Engine): 5 tiêu chí Rubric, mô hình khấu trừ vi phạm Penalty mốc 100, 3 cấp độ nghiêm ngặt AI (EASY/MEDIUM/HARD), nguyên tắc Infraction Ceiling, điều kiện đạt Mức 5 (Xuất sắc), và công thức hòa trộn Blending 50/50.
    5. Bảng Đối chiếu Tham số & Các Case Điển hình Thực tế.

Decisions Applied:
- Trình bày công thức toán học rõ ràng và bảng đối chiếu trực quan.
- Dùng Mermaid flow diagram để minh họa luồng thu thập và tính điểm.

Deferred / Not Changed:
- Không thay đổi mã nguồn backend hay frontend runtime.

## Next Step
- Step 7: Test
