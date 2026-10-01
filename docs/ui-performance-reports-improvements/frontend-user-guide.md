# Hướng dẫn sử dụng giao diện: Trung tâm Báo cáo Hiệu suất (Performance Reports)

Dành cho mọi vai trò. Tài liệu mô tả giao diện trang Performance Reports sau task `ui-performance-reports-improvements`. Task chỉ thay đổi giao diện; cách tính điểm, dữ liệu, API và quyền truy cập không đổi.

---

## 1. Điều kiện tiên quyết và khởi động

| Mục | Giá trị |
|---|---|
| Backend | `npm --prefix backend run dev` (cổng `3000`) hoặc Docker Compose (backend ở `BACKEND_PORT`, mặc định `8080`) |
| Frontend | `npm --prefix frontend run dev` (Vite, mặc định `http://localhost:5173`) hoặc Docker Compose (`FRONTEND_PORT`) |
| API base URL | `VITE_API_BASE_URL` phải trỏ đúng backend đang chạy (mặc định `http://localhost:3000`) |
| Migration | `npm --prefix backend run migrate:up` để có nhãn tiếng Việt, tên tab mới và tên vai trò, từ migration `1792000000003_seed_reports_and_hub_ui_i18n_translations`. Nếu chưa chạy, nội dung các tab hiển thị tiếng Anh và tên tab còn số thứ tự "1. 2. 3. 4.". |
| Dừng | `Ctrl+C` ở terminal dev, hoặc `docker compose down` |

Tài khoản mẫu: xem `README.md`. Lưu ý: `docker compose run --rm migrate` còn chạy `npm run seed` và đặt lại dữ liệu seed.

---

## 2. Truy cập và các tab

- **Đường dẫn:** `/admin/reports` (menu *Reporting → Performance Reports*). Tab đang mở nằm trong tham số `?scope=my|team|org|summary`.
- **Tab theo vai trò** (backend vẫn là nơi quyết định quyền xem dữ liệu):

| Vai trò | My Report | Team Report | Organization Report | KPI Summary Dashboard |
|---|---|---|---|---|
| SYSTEM_ADMIN, HR_ADMIN | ✓ | ✓ | ✓ | ✓ |
| MANAGER | ✓ | ✓ | — | ✓ |
| EMPLOYEE | ✓ | — | — | ✓ |

- Mở `?scope=` của tab không được phép sẽ tự chuyển về tab đầu tiên được phép.
- Banner dùng chung kiểu với các hub khác và hiển thị tiêu đề hub; thanh header trên cùng hiển thị breadcrumb *Nhóm menu › Tab đang mở* (ví dụ *Reporting › Team Report*); các tab hub giữ nguyên độ rộng khi được chọn; chip bên phải hiển thị vai trò bằng tên dễ đọc (ví dụ *HR Admin* / *Quản trị nhân sự*).
- **Mô tả tab:** tab hub đang chọn có biểu tượng ⓘ; rê chuột vào ⓘ để xem mô tả ngắn của tab (trình đọc màn hình đọc mô tả khi focus vào tab). Áp dụng cho cả 6 hub (Evaluations, Evaluation Cycles, Notifications, KPI & Templates, System & Security, Performance Reports).
- Trong hub, mỗi tab không lặp lại tiêu đề trang riêng; nội dung tab thẳng mép với banner.
- **Cuộn:** banner, thanh tab, bộ lọc và thẻ số liệu đứng yên; chỉ bảng/danh sách chính của tab cuộn (tiêu đề bảng luôn dính ở trên). Cửa sổ quá thấp, hoặc tab không có bảng (Organization Report), thì cả trang cuộn.
- **Tab con:** tab có nhiều bảng dùng tab con dạng segmented — Team Report: *KPI Averages / KPI Trend*; KPI Summary: *KPI Items / Relationships*. Route độc lập vẫn hiện tất cả cùng lúc.

---

## 3. Bố cục chung của các tab

- **Report Filters / Bộ lọc báo cáo:** card ở đầu mỗi tab chứa các bộ lọc; góc phải hiển thị *Data as of … / Dữ liệu tính đến …* (thời điểm read model được làm mới), định dạng theo ngôn ngữ đang chọn.
- **Thẻ số liệu:** khi chưa có điểm (chưa có đánh giá nào hoàn tất), thẻ hiện "—" kèm dòng *Scores appear once evaluations are completed.*
- **Trạng thái trống:** biểu tượng tròn, tiêu đề và mô tả ngắn cho biết cần làm gì tiếp.
- Giao diện sáng/tối và tiếng Anh/tiếng Việt áp dụng cho toàn bộ nội dung các tab.

---

## 4. Từng tab

### My Report (Báo cáo của tôi)
- Chọn *Evaluation Cycle*; hiển thị Final / Manager / Self score và chi tiết KPI. Nút **Explain** mở bảng giải thích nguồn gốc điểm và minh chứng.
- Đánh giá đã khóa hiện nhãn *Evaluation Locked* cạnh bộ lọc.
- Tài khoản không gắn với hồ sơ nhân viên (ví dụ tài khoản quản trị thuần) hiện *No employee profile linked* thay vì báo lỗi, và không gửi request.

### Team Report (Báo cáo đội nhóm)
- Bộ lọc: *Team*, *Current Cycle*, *Compare with (Previous Cycle)*.
- Đổi team **không rời khỏi hub**: team đang chọn được lưu trong `?scope=team&team=<id>`.
- *Compare with* mặc định là *No comparison*; bảng *Cross-cycle KPI Trend* nhắc chọn kỳ so sánh và chỉ tải xu hướng khi đã chọn.
- Chỉ hiển thị số liệu tổng hợp (điểm trung bình, tỷ lệ hoàn tất, số thành viên, KPI trung bình) — không xếp hạng cá nhân.

### Organization Report (Báo cáo toàn công ty)
- Bộ lọc: *Evaluation Cycle*. Thẻ điểm trung bình và tỷ lệ hoàn tất toàn công ty.
- **Score Distribution / Phân phối điểm:** hiển thị dạng thanh ngang (số lượng và phần trăm theo khoảng điểm), chỉ là số liệu tổng hợp.

### KPI Summary Dashboard (Tổng hợp KPI)
- Tìm nhân viên theo tên (có dấu), mã, email; lọc theo phòng ban, đội nhóm, vai trò, trạng thái; chọn kỳ.
- Hiển thị thông tin nhân viên, điểm chính thức, bảng KPI (thứ tự theo mẫu đánh giá), bảng chi tiết KPI và sơ đồ quan hệ (có chế độ danh sách hỗ trợ tiếp cận).

---

## 5. System & Security Hub (`/admin/system-admin`)

Task này cũng đồng bộ khung nội dung của hub quản trị hệ thống (SYSTEM_ADMIN, HR_ADMIN):

- **Cuộn:** banner, thanh tab, thanh công cụ đứng yên; chỉ bảng chính cuộn, tiêu đề bảng dính ở trên và thanh cuộn bắt đầu ngay dưới tiêu đề bảng (Firefox: thanh cuộn chạy hết chiều cao khung). Tab **Audit Logs**: bảng tự cuộn, phân trang luôn ở đáy. Tab **Translations**: thanh *Save Translations* luôn ở dưới bảng.
- **Độ rộng:** nội dung 4 tab (Organization, IAM & Roles, Audit Logs, Translations) thẳng mép với banner.
- **Tiêu đề:** các tab không còn tiêu đề trang riêng (tab Organization không còn hiện nhầm "Review Due Dashboard").
- **Tab theo cấp:** mỗi cấp một kiểu — cấp 1 (tab hub) gạch chân kèm nhãn màu; cấp 2 (*Org Structure / Job Architecture*, *Users / Roles / Permissions*) dạng segmented (rãnh xám, mục đang chọn nổi trắng); cấp 3 (tab con trong Org Structure và Job Architecture) dạng pill bo tròn. Bên trong:
  - *Org Structure* — cấp gốc *Tổng quan tổ chức / Organization Overview*: *Departments / Employees*; phòng ban: *Teams / Employees / Evaluation Formula*; đội: *Members / Evaluation Formula*. Đổi phòng ban/đội vẫn giữ tab con đang chọn nếu cấp mới có tab đó. Cây tổ chức bên trái cuộn riêng. Nút tạo mới (*+ Create Department / + Create Team / + Add Employee*) nằm bên phải hàng tab con, theo tab đang chọn; tab *Evaluation Formula* không có nút này.
  - *Job Architecture*: *Job Roles / Job Levels / Review Cadences*, mỗi lần một bảng; nút *+ Create Role / Level / Cadence* nằm bên phải hàng tab con.
- **Bộ lọc IAM:** các ô *Search / Role / Status* (Users), *Search* (Roles), *Search / Module* (Permissions) có nhãn phía trên, cùng kiểu với bộ lọc Audit Logs.
- **Nút thao tác IAM:** trong Users và Roles (cả dạng bảng lẫn dạng thẻ), nút sửa (✎) và bật/tắt tài khoản (⏻) chỉ còn biểu tượng; rê chuột để xem tên thao tác.
- **Vai trò:** chip trên banner hiển thị tên dễ đọc (ví dụ *HR Admin* / *Quản trị nhân sự*), dùng chung bản dịch `common.role_label.*` với trang Performance Reports.

---

## 6. Thay đổi chung

- **Logo:** sidebar dùng logo mới (biểu tượng mỏ neo, "PERFORMANT — MEMBER KPI • MARINE LOGISTICS"); khi thu gọn sidebar chỉ còn biểu tượng. Favicon trình duyệt chưa đổi.
- **Cửa sổ thấp:** khi không đủ chỗ cho bảng (tối thiểu 240px) cả trang cuộn; nội dung không bao giờ tràn ra khỏi khung card.

## 7. Giới hạn đã biết

- **Score Distribution** của tab Organization hiện luôn trống: backend chưa ghi dữ liệu `score_distribution` cho báo cáo tổ chức (cần task backend riêng).
- Dữ liệu chỉ có khi có đánh giá hoàn tất; khi mọi đánh giá còn OPEN, điểm hiển thị "—".
- Khung báo lỗi dùng chung (`ErrorAlert`) và khối minh chứng (`EvidenceViewer`) thuộc module khác, chưa hỗ trợ giao diện tối.
- Mã trạng thái đánh giá (`APPROVED`, `DRAFT`…) và loại quan hệ trong sơ đồ hiển thị nguyên mã từ hệ thống.
- Tab **Translations** (khi đã chọn mục) và **KPI Summary** có nhiều phần cố định phía trên bảng; ở cửa sổ cao khoảng 900px cả trang vẫn cuộn thêm một đoạn.
- Chọn nhân viên trong tab KPI Summary của hub chuyển sang trang độc lập `/reports/employees/:id/kpi-summary` (hành vi có sẵn).
- Các route cũ `/admin/team-report/:teamId`, `/admin/my-report/:employeeId`, `/reports/employees/:id/kpi-summary` vẫn hoạt động như trang độc lập (có tiêu đề riêng).
