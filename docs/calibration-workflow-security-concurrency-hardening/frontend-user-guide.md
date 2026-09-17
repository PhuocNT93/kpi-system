# Hướng Dẫn Sử Dụng Giao Diện Hiệu Chuẩn Điểm (Calibration User Guide)

Tài liệu này hướng dẫn chi tiết về nghiệp vụ, luồng thao tác và xử lý ngoại lệ trên giao diện **Hiệu chuẩn điểm đánh giá (Calibration Sessions)** dành cho Quản trị viên Nhân sự (**HR_ADMIN**).

---

## 1. Phân Quyền Truy Cập (Access Control)

* **HR_ADMIN**: Được cấp toàn quyền truy cập giao diện, xem phân phối điểm, tạo phiên hiệu chuẩn, điều chỉnh điểm số (Final Score) và chốt phiên (Finalize).
* **EMPLOYEE, MANAGER, SYSTEM_ADMIN**: Khi truy cập đường dẫn `/calibration`, hệ thống sẽ chặn và hiển thị màn hình từ chối truy cập:
  > **Không có quyền truy cập (403 Forbidden)**: Tính năng Hiệu chuẩn điểm (Calibration) chỉ dành riêng cho Quản trị viên nhân sự (HR_ADMIN).

---

## 2. Các Trạng Thái Kỳ Đánh Giá Trên Giao Diện

### 2.1. Kỳ Đánh Giá Đang Mở & Bật Hiệu Chuẩn (`calibration_enabled = true`)
* Hiển thị danh sách các phiên hiệu chuẩn thuộc kỳ đánh giá.
* Cho phép bấm **"Tạo phiên hiệu chuẩn mới"** (Create Session) theo phạm vi toàn công ty (ORGANIZATION), phòng ban (DEPARTMENT) hoặc đội nhóm (TEAM).

### 2.2. Kỳ Đánh Giá Tắt Hiệu Chuẩn (`calibration_enabled = false`)
* Xuất hiện cảnh báo màu đỏ nhạt:
  > **Hiệu chuẩn điểm bị tắt (Calibration Disabled)**: Kỳ đánh giá này được cấu hình không áp dụng bước hiệu chuẩn. Đánh giá sẽ chuyển thẳng từ Đang duyệt (`REVIEWING`) sang Phê duyệt (`APPROVED`).
* Nút tạo phiên hiệu chuẩn mới bị vô hiệu hóa / ẩn để tránh sai lệch quy trình.

### 2.3. Kỳ Đánh Giá Bị Khóa (`status = LOCKED`)
* Xuất hiện cảnh báo màu vàng:
  > **Kỳ đánh giá đã bị khóa (LOCKED)**: Tất cả các phiên hiệu chuẩn thuộc kỳ đánh giá này đều ở chế độ chỉ đọc. Không thể tạo mới hay điều chỉnh điểm số.
* Tất cả nút điều chỉnh điểm và chốt phiên chuyển sang trạng thái bị vô hiệu hóa (disabled).

---

## 3. Quy Trình Điều Chỉnh Điểm Hiệu Chuẩn (Score Adjustment)

1. **Chọn kỳ và phiên hiệu chuẩn**: Lựa chọn Kỳ đánh giá và Phiên hiệu chuẩn tương ứng trên thanh công cụ trên cùng.
2. **Xem biểu đồ phân phối**: Quan sát biểu đồ đường cong phân phối điểm số (phần trăm xếp loại Xuất sắc, Đạt yêu cầu, Cần cải thiện, v.v.) so với tỷ lệ chuẩn.
3. **Mở hộp thoại điều chỉnh**: Bấm nút **"Hiệu chuẩn"** trên dòng nhân viên cần điều chỉnh.
4. **Hộp thoại Hiệu chuẩn (Adjustment Modal)**:
   * **Điểm tính toán gốc (Calculated Score)**: Điểm số tính toán từ các KPI và tiêu chí của nhân viên, được giữ nguyên vẹn để làm bằng chứng nguồn (provenance).
   * **Điểm cuối hiện tại (Current Final Score)**: Điểm số hiện tại đang được áp dụng.
   * **Điểm hiệu chuẩn mới (New Final Score)**: Nhập điểm số mới (từ 0 đến 100).
   * **Lý do điều chỉnh (Reason - Bắt buộc)**: Cần nhập tối thiểu 3 ký tự giải trình rõ lý do (ví dụ: *Cân đối theo đường cong hiệu suất của toàn khối; đóng góp xuất sắc ngoài dự kiến trong quý*). Nút "Lưu hiệu chuẩn" sẽ báo lỗi nếu bỏ trống lý do.
5. **Ghi nhận kiểm toán**: Sau khi lưu thành công, hệ thống ghi nhận một bản ghi điều chỉnh (`calibration_adjustment`) và một bản ghi nhật ký kiểm toán (`audit_log` với hành động `CALIBRATION_ADJUST`) trong cùng một transaction.

---

## 4. Xử Lý Xung Đột Dữ Liệu Đồng Thời (Concurrency & 409 Conflict)

Khi có hai người dùng hoặc hai tab cùng thao tác trên một dữ liệu:

* **Xung đột điều chỉnh điểm (409 Conflict / Version Mismatch)**:
  * Nếu điểm của phiếu đánh giá đã bị điều chỉnh bởi người khác trước khi bạn bấm Lưu, hộp thoại sẽ hiển thị thông báo:
    > *Xung đột dữ liệu (409 Conflict): Phiếu đánh giá đã bị thay đổi bởi người dùng khác hoặc kỳ đánh giá đã bị khóa. Vui lòng tải lại dữ liệu.*
  * Toàn bộ giá trị điểm mới và lý do bạn vừa nhập vẫn được **giữ nguyên trên form** (không bị mất), giúp bạn đối chiếu và tải lại trang khi cần thiết.
* **Xung đột chốt phiên (Double Finalize)**:
  * Nếu hai người quản trị cùng bấm nút "Chốt phiên hiệu chuẩn" cùng lúc, yêu cầu đầu tiên sẽ thành công (`200 OK`). Yêu cầu thứ hai sẽ nhận phản hồi `409 Conflict`:
    > *Xung đột dữ liệu (409 Conflict): Phiên hiệu chuẩn đã được chốt bởi người khác hoặc kỳ đánh giá đã bị khóa. Vui lòng tải lại trang.*

---

## 5. Chốt Phiên Hiệu Chuẩn (Finalize Session)

1. Bấm nút **"Chốt phiên hiệu chuẩn"** (Finalize Session).
2. Xác nhận trong hộp thoại cảnh báo: Thao tác này là **bất biến (irreversible)**.
3. Khi hoàn tất:
   * Phiên chuyển sang trạng thái `FINALIZED`.
   * Toàn bộ các phiếu đánh giá trong phiên tự động chuyển từ `CALIBRATION` sang `APPROVED` và ngay lập tức sang `PUBLISHED` trong cùng 1 transaction database duy nhất.
   * Nhân viên có thể xem được điểm số chính thức (`final_score`) khi đăng nhập vào hệ thống.

---

## 6. Quy Trình Hiệu Chỉnh Điểm Theo Từng KPI (Category > Critical & Rule > KPI)

Theo nguyên tắc nghiệp vụ, điểm đánh giá tổng thể không được ghi đè tùy tiện mà phải thực hiện hiệu chuẩn chi tiết đến **từng KPI mục tiêu**. Sau đó, hệ thống sẽ tự động quy chuẩn về phần trăm (%) và tính toán lại điểm tổng.

### 6.1. Nhận Biết KPI / Tiêu Chí Đã Được Hiệu Chỉnh
* Trên danh sách thẻ KPI và tiêu chí tại trang Chi tiết đánh giá (`EvaluationDetailPage`), các KPI đã có điều chỉnh điểm sẽ hiển thị huy hiệu nổi bật:
  * **Thẻ nhóm KPI**: `⚡ Đã hiệu chỉnh: {manual_override_score}%` (màu hổ phách).
  * **Từng tiêu chí con**: `⚡ Đã hiệu chỉnh: {manual_override_score}% (Gốc: {raw_score}%)`.
  * Rê chuột lên huy hiệu sẽ hiển thị chi tiết lý do hiệu chuẩn đã được ghi nhận.
* Các KPI chưa có can thiệp thủ công sẽ hiển thị trạng thái `Chưa hiệu chỉnh` với điểm tính toán tự động ban đầu.

### 6.2. Luồng Lựa Chọn Phân Cấp 3 Bước (3-Tier Selection)
Khi bấm nút **"Hiệu chỉnh điểm KPI"** trên đầu trang hoặc bấm trực tiếp trên thẻ KPI tương ứng:
1. **Bước 1 - Chọn Category (Nhóm danh mục)**:
   * Chọn giữa các nhóm nghiệp vụ chính: **Hiệu suất (Performance)**, **Năng lực (Capability)**, **Đóng góp (Contribution)** hoặc danh mục tiêu chí chung.
   * Mỗi thẻ danh mục hiển thị số lượng KPI và số KPI đã hiệu chỉnh (ví dụ: `Hiệu suất: 1/3 đã chỉnh`).
2. **Bước 2 - Chọn Critical & Rule (Tiêu chí & Quy tắc)**:
   * Danh sách tiêu chí thuộc nhóm Category đã chọn.
   * Hiển thị rõ mã tiêu chí, tên tiêu chí và quy tắc tính điểm đi kèm (ví dụ: `Tiến độ giao hàng (DELIVERY_ON_TIME) • Quy tắc: [RANGE_THRESHOLD]`).
   * Tiêu chí đã được hiệu chỉnh sẽ có dấu hiệu nhận biết `★ [Đã hiệu chỉnh]`.
3. **Bước 3 - Chọn KPI Mục tiêu & Nhập Điểm Mới**:
   * Hiển thị thông tin KPI, Trọng số (%) và Điểm tính toán gốc.
   * **Nhập điểm hiệu chuẩn mới**: Nhập số phần trăm từ $0\%$ đến $100\%$.
   * **Xem trước điểm đóng góp (Live Preview)**: Hệ thống tính trước điểm đóng góp vào tổng điểm:
     $$\text{Đóng góp mới} = \frac{\text{Điểm mới}}{100} \times \text{Trọng số}$$
     giúp người đánh giá nắm được mức tăng/giảm trước khi lưu.
   * **Lý do hiệu chuẩn (Bắt buộc)**: Nhập tối thiểu 3 ký tự giải trình lý do phục vụ kiểm toán minh bạch.
4. Bấm **"Lưu hiệu chỉnh & Tính lại"**:
   * Hệ thống lưu điểm số mới, cập nhật bảng `evaluation_item`.
   * Tự động tính toán lại điểm tổng `manager_score` và `final_score` theo % trọng số.
   * Ghi nhật ký kiểm toán và cập nhật giao diện tức thì.
