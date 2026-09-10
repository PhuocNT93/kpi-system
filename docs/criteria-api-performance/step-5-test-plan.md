# Step 5 - Test Plan

Status: produced during this step

## Deliverable

**Automated Tests:**
- Chạy npm test ở thư mục backend để đảm bảo API getCriteria không bị break và logic return chính xác.
  
**Manual Tests:**
- Gọi API GET `/api/criteria` (kèm token hợp lệ) với các param phân trang (`offset=0`, `limit=20`).
- Kiểm tra response time (TTFB) trong Network tab, phải < 500ms.
- Kiểm tra kết quả json trả về xem có đủ các thông tin: `id`, `name`, `status`, `current_version`, `scoring_rule`.
- Sắp xếp phải theo đúng `created_at DESC`.
