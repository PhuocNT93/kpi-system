# Hướng dẫn sử dụng giao diện: Nhật ký kiểm toán (Audit Logs)

Dành cho HR Admin và System Admin. Tài liệu mô tả giao diện trang Audit Log sau task `ui-audit-log-improvements`. Task chỉ thay đổi giao diện; dữ liệu, quyền truy cập và API không đổi.

---

## 1. Điều kiện tiên quyết và khởi động

| Mục | Giá trị |
|---|---|
| Backend | `npm --prefix backend run dev` (cổng `3000`) hoặc Docker Compose (backend ở `BACKEND_PORT`, mặc định `8080`) |
| Frontend | `npm --prefix frontend run dev` (Vite, mặc định `http://localhost:5173`) hoặc Docker Compose (`FRONTEND_PORT`, mặc định `4001`) |
| API base URL | `VITE_API_BASE_URL` phải trỏ đúng backend đang chạy (mặc định `http://localhost:3000`) |
| Migration | `npm --prefix backend run migrate:up` (hoặc `docker compose run --rm migrate`) để có nhãn tiêu đề trang, badge vai trò và nút Tìm kiếm bằng tiếng Việt, từ migration `1791000000010_seed_audit_scoped_ui_i18n_translations`. Nếu chưa chạy, các nhãn này hiển thị tiếng Anh. |
| Dừng | `Ctrl+C` ở terminal dev, hoặc `docker compose down` |

Tài khoản mẫu: xem `README.md`. Lưu ý: `docker compose run --rm migrate` còn chạy `npm run seed`, script này xóa toàn bộ bảng `audit_log` và đặt lại dữ liệu seed.

---

## 2. Truy cập

- **Đường dẫn:** tab **Audit Logs** trong *System & Security Hub* (`/admin/system-admin?tab=audit`, menu *Configuration → System & Security Hub*). Đường dẫn cũ `/admin/audit-logs` tự chuyển về tab này.
- **Quyền:** `SYSTEM_ADMIN` xem toàn bộ; `HR_ADMIN` chỉ xem các loại thực thể nghiệp vụ. Vai trò khác thấy thông báo *Access Denied (403 Forbidden)*.
- Trong hub, tiêu đề và vai trò hiển thị ở banner của hub; trang Audit không lặp lại tiêu đề riêng.

---

## 3. Bộ lọc (Audit Filters)

- **Entity Type / Action:** lọc **ngay khi chọn**, quay về trang 1.
- **Entity ID:** nhập UUID rồi bấm **Search** hoặc nhấn **Enter**. Gõ phím không tự lọc. Khoảng trắng đầu/cuối được bỏ.
- **Search** khi không đổi điều kiện: tải lại danh sách hiện tại.
- **Badge số** cạnh tiêu đề *Audit Filters*: số bộ lọc đang áp dụng.
- **Nút Reset** (biểu tượng tròn ↺): xóa mọi bộ lọc, kể cả nội dung đang gõ ở Entity ID. Bị làm mờ khi chưa có bộ lọc nào.

---

## 4. Bảng nhật ký

- Mỗi trang 20 bản ghi, sắp xếp mới nhất trước. Phân trang (*Previous / Next*) và tổng số bản ghi luôn hiển thị dưới bảng.
- **Cuộn:** chỉ phần thân bảng cuộn; tiêu đề cột đứng yên và trang không cuộn. Bên phải bảng có một dải hẹp cố định cho thanh cuộn, chạy từ tiêu đề xuống hết nội dung. Màn hình hẹp hơn 1100px: bảng cuộn ngang.
- **Action** và **Entity Type** hiển thị dạng badge màu. Giá trị quá dài được rút gọn bằng "…"; rê chuột để xem đủ.
- **Entity ID** rút gọn; rê chuột để xem UUID đầy đủ.
- **Reason / Note:** trường thay đổi với giá trị cũ (gạch ngang) → giá trị mới, kèm lý do nếu có.
- **Xem chi tiết:** bấm vào bất kỳ đâu trên dòng hoặc nút **Details**. Bôi đen chữ trong dòng (ví dụ để copy Entity ID) không mở cửa sổ chi tiết. Cửa sổ chi tiết chỉ đọc, không có thao tác sửa/xóa (audit là append-only).
- Không có bản ghi phù hợp: hiển thị biểu tượng kính lúp và thông báo *No matching records found with current filter conditions.*

---

## 5. Giao diện sáng/tối và ngôn ngữ

- Toàn bộ trang hỗ trợ giao diện sáng và tối (nút mặt trời/mặt trăng trên header).
- Ngôn ngữ theo lựa chọn ở header (English / Tiếng Việt).

---

## 6. Giới hạn đã biết

- Tiêu đề cửa sổ chi tiết có thể hiển thị nhãn của màn hình khác (ví dụ *"Khởi tạo Đánh giá Cá nhân (Review Due)"*). Nguyên nhân: frontend gộp bản dịch của mọi màn hình vào một từ điển chung nên key dùng chung như `modal_title` bị ghi đè. Task này chỉ sửa tiêu đề trang, badge vai trò và nút Tìm kiếm bằng key riêng `audit_*`; lỗi gốc cần task riêng.
- Nút **Search** chỉ áp dụng cho ô Entity ID; hai danh sách chọn luôn lọc ngay.
