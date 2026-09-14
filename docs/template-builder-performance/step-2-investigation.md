# Step 2 - Investigation

Status: produced during this step

## Deliverable

1.  **Phát hiện nguyên nhân chậm**: Tương tự lỗi API `/criteria` trước đó, khi load giao diện Template Builder (gọi API lấy snapshot chi tiết của template version), backend đang gặp lỗi **N+1 Query** trong `ConfigurationSnapshotService.generateSnapshot()`.
2.  **Chi tiết lỗi**: Đoạn code hiện tại đang lặp qua toàn bộ số lượng tiêu chí (`templateCriteria`) của bộ mẫu. Với mỗi tiêu chí, hệ thống thực hiện 3 lệnh SQL riêng lẻ để lấy: `criterionVersion`, `criterion` và `scoringRule`. Nếu bộ mẫu có 50 tiêu chí, backend sẽ bắn 151 câu query SQL tuần tự, gây nghẽn kết nối và khiến server phản hồi chậm.
