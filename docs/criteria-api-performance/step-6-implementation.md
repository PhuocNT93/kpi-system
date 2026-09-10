# Step 6 - Implementation

Status: produced during this step

## Deliverable

Changes Made:
- Sửa lại câu lệnh query `findAllWithCurrentVersion` trong `postgres-criterion.repository.ts`.
- Sử dụng sub-query để filter và pagination trên `criteria` trước, sau đó dùng `LATERAL JOIN` để chọn ra đúng version mới nhất. Đảm bảo tốc độ truy vấn phân trang luôn ở mức vài miliseconds bất kể khối lượng data.

Decisions Applied:
- Sắp xếp (order by) kết quả trả về theo `created_at DESC` thay vì để database tự sort ngẫu nhiên theo `c.id` ở query cũ.

Deferred / Not Changed:
- Không thay đổi DTO hay cấu trúc Controller.
