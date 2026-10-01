# Step 1: Understand

Status: reconstructed from approved response

## Deliverable

### Goal
Cho phép quản lý vòng đời của Crawl Script sau khi đã xuất bản (Disable/Enable hoặc Delete script), đồng thời nâng cấp hệ thống logging của Crawl Job để khi người dùng mở xem log có thể theo dõi chi tiết từng bước mà script đang chạy theo thời gian thực.

### Expected Behavior
1. Quản lý Crawl Script sau khi Publish:
   - Cho phép chuyển trạng thái script đã xuất bản (PUBLISHED) sang DISABLED và ngược lại.
   - Script ở trạng thái DISABLED sẽ không thể chọn khi tạo/chỉnh sửa Crawl Job mới và không cho phép kích hoạt chạy run job mới.
   - Cho phép xóa Crawl Script đã xuất bản nếu script chưa được gắn vào Crawl Job Definition nào đang kích hoạt.
   - Nếu script đang được liên kết với Crawl Job Definition, hệ thống ngăn chặn hành động xóa và hiển thị thông báo hướng dẫn rõ ràng.
   - Lịch sử thực thi quá khứ (crawl_job_execution) vẫn bảo toàn nguyên vẹn snapshot checksum, mã nguồn và kết quả nhờ thiết lập crawl_script_version_id ON DELETE SET NULL.
2. Chi tiết từng bước script đang run trong Log Viewer:
   - Sandbox & Worker truyền console.log / log(...) từ script trực tiếp vào execution.logs.
   - Tự động ghi nhận các bước: khởi tạo, gọi API nguồn, nhận dữ liệu, lọc nhân viên, trích xuất chỉ số.
   - Giao diện xem log làm nổi bật các tag [Script Step: ...] với huy hiệu màu sắc trực quan.

### Acceptance Criteria
1. Bổ sung endpoint backend POST /api/crawl-scripts/:id/disable và POST /api/crawl-scripts/:id/enable.
2. Hỗ trợ xóa script sau khi publish (DELETE /api/crawl-scripts/:id) với kiểm tra ràng buộc toàn vẹn dữ liệu và bảo vệ an toàn audit history.
3. Cập nhật bảng Crawl Scripts trên Frontend có đầy đủ nút hành động: Vô hiệu hóa (Disable), Kích hoạt lại (Enable), và Xóa (Delete) kèm badge trạng thái tương ứng.
4. Môi trường Sandbox của script hỗ trợ console.log / log và tự động ghi log từng bước vào lịch sử chạy.
5. Giao diện xem log của Crawl Job hiển thị rõ ràng, tách bạch từng bước chạy của script.

### Out of Scope
- Chỉnh sửa logic tính toán công thức KPI hoặc prompt tính điểm AI đã được phê duyệt ở các bước trước.
- Can thiệp vào các module khác ngoài Crawl Jobs và Crawl Scripts.

### Business Rules Involved
- Nguyên tắc bất biến lịch sử (Immutable History): Lịch sử thực thi job (crawl_job_execution) phải bảo lưu snapshot code và checksum ngay cả khi script version bị xóa.
- Không cho phép chạy Crawl Job nếu script liên kết đang ở trạng thái DISABLED.

### Open Questions / Conflicts
- None
