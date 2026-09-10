# Step 3 - Planning

Status: produced during this step

## Deliverable

Goal: Tối ưu hoá SQL query lấy danh sách criteria để giảm thời gian phản hồi API từ 12s xuống dưới 100ms.

Changes:
- **`backend/src/modules/configuration/infrastructure/persistence/postgres-criterion.repository.ts`**:
  - Viết lại hàm `findAllWithCurrentVersion()`.
  - Thay thế `DISTINCT ON` bằng Sub-query phân trang trên bảng `criteria` và `LEFT JOIN LATERAL` với `criterion_versions` để lấy version mới nhất.

Verification:
- Chạy unit test/integration test.
- Check thủ công API /criteria để đảm bảo performance.
