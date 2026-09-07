# Step 1: Understand

Status: produced during this step

## Deliverable
### Task Understanding

Goal:
Triển khai tính năng Đa ngôn ngữ (i18n) dựa trên bảng `i18n_translation` generic (Polymorphic schema) theo đúng kiến trúc thiết kế LLD v1.5 (Mục 10.9 & Mục 21.1).

Expected Behavior:
1. Master / Reference Data: Tên & mô tả của các thực thể master data (`DEPARTMENT`, `TEAM`, `ROLE`, `JOB_LEVEL`, `REVIEW_CADENCE`, `CRITERION`, `CRITERION_LEVEL`, `EVALUATION_TEMPLATE`) không lưu cột tên cố định trong bảng chính mà resolve qua bảng `i18n_translation`.
2. Polymorphic Storage (`i18n_translation`):
   - Schema: `translation_id`, `entity_type`, `entity_id`, `field_name`, `locale`, `value`, `created_at`, `updated_at`, `created_by`, `updated_by`.
   - Unique constraint trên `(entity_type, entity_id, field_name, locale)`.
   - Hỗ trợ mở rộng động >2 ngôn ngữ (khởi điểm EN/VI, sẵn sàng cho JA/KO...) mà không cần thay đổi DB schema.
3. Mẫu ngôn ngữ chuẩn & Fallback:
   - Tiếng Anh (`locale = 'en'`) là baseline bắt buộc khi tạo bất kỳ master entity nào. Các ngôn ngữ khác (`vi`, `ja`...) là tùy chọn.
   - Khi query hiển thị, nếu không tìm thấy bản dịch theo locale yêu cầu, hệ thống sẽ tự động fallback về tiếng Anh (`'en'`).
4. Locale Resolution 4 tầng:
   - Priority 1: `user_account.locale` (nếu user đã đăng nhập).
   - Priority 2: Query parameter `?locale=xx`.
   - Priority 3: HTTP Header `Accept-Language`.
   - Priority 4: Mặc định hệ thống (`'en'`).
5. API & Management:
   - `GET /i18n/locales`: Danh sách các locale hệ thống hỗ trợ.
   - `GET /i18n/{entity_type}/{entity_id}` & `PUT /i18n/{entity_type}/{entity_id}`: Quản lý toàn bộ bản dịch của 1 master record.
   - `PATCH /users/me/locale`: Thay đổi ngôn ngữ ưu tiên của người dùng.
6. Evaluation Item Snapshot:
   - Lưu trữ snapshot tất cả bản dịch dưới dạng `jsonb` map (ví dụ: `{"en": "On-time Completion", "vi": "Hoàn thành đúng hạn"}`) để bảo toàn dữ liệu lịch sử và tự động hỗ trợ ngôn ngữ mới cho các kỳ đánh giá sau.

Acceptance Criteria:
1. Database & Migration: Tạo migration DB bổ sung bảng `i18n_translation` với đầy đủ indexes & unique constraints.
2. Backend Services & API: Triển khai I18n Module/Service xử lý CRUD, caching, và fallback logic. Tích hợp I18n Resolution vào các API trả về Master Data. Cung cấp các endpoint `/i18n/*` và `/users/me/locale`.
3. Evaluation Snapshot Integration: Cập nhật service tạo `evaluation_item` để snapshot thông tin tiêu chí dưới dạng `jsonb` map đa ngôn ngữ.
4. Testing: Viết Unit Tests & Integration Tests kiểm tra đầy đủ fallback logic, CRUD bản dịch, snapshot jsonb, và audit log.

Out of Scope:
- Không tự động dịch bằng máy (Machine Translation) đối với nội dung người dùng nhập tự do (`comment`, `evidence`, `full_name`).
- Không hỗ trợ đa ngôn ngữ cho file xuất báo cáo PDF/Excel ở MVP (dành cho Phase 2).

Business Rules Involved:
- Rule 12: Mọi master entity phải có bản dịch `locale='en'` tại thời điểm tạo; các locale khác tùy chọn, fallback về `'en'`.
- Rule 13: Evaluation snapshot lưu toàn bộ bản dịch tại thời điểm tạo dưới dạng `jsonb` map.
- Rule 14: Thêm locale mới vào hệ thống là thao tác runtime, không cần đổi DB schema hay deploy code.

Open Questions / Conflicts:
- None.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md` (v1.5)
- User query regarding multi language `i18n_translation`.

## Actions and Evidence
- Analyzed LLD changelog and sections 10.9 & 21.1.

## Decisions and Rationale
- Standardized multi-language strategy around generic `i18n_translation` polymorphic table.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
