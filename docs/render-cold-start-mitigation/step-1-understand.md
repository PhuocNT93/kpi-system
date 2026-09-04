# Step 1: Understand

Status: reconstructed from an earlier approved response

## Deliverable

### Task Understanding

Goal: Loại bỏ hoặc giảm tối đa tác động của việc Render free-tier tự động spin down service `kpi-system-develop-api` sau khoảng 15 phút không có request, khiến request kế tiếp bị cold start khoảng 30-60 giây và người dùng thấy ứng dụng treo hoặc lỗi mạng.

Expected Behavior:
- Backend develop phản hồi trong thời gian chấp nhận được cho request đầu tiên sau thời gian rảnh trong giờ làm việc.
- Khi cold start vẫn xảy ra, frontend hiển thị trạng thái "server đang khởi động" thay vì lỗi mạng chung, và API client không thất bại vì timeout ngắn.
- Không thay đổi business logic, RBAC, workflow, scoring, audit.

Acceptance Criteria:
1. Có tài liệu so sánh và lựa chọn phương án xử lý spin-down kèm rủi ro và giới hạn.
2. Phương án được chọn có bước triển khai cụ thể áp dụng cho `render.develop.yaml` và `DEVELOP_DEPLOYMENT.md`.
3. Endpoint được ping là public, rẻ, không yêu cầu auth, không ghi audit log.
4. Frontend có timeout và retry hợp lý, cùng trạng thái "server đang khởi động" cho lần gọi đầu.
5. Không hard-code secret hoặc deploy hook trong repo; không mở thêm bề mặt tấn công.
6. Không phá vỡ CI/CD develop hiện tại và không tăng chi phí ngoài mức đã duyệt.

Out of Scope:
- Thay đổi kiến trúc backend, module nghiệp vụ, schema database, migrations.
- Môi trường staging và production.
- Tối ưu hiệu năng chung của ứng dụng.

Business Rules Involved:
- Endpoint keep-alive phải read-only, không sinh audit event (quy tắc audit append-only).
- Không lộ thông tin nhạy cảm qua endpoint public.
- Không bỏ qua quy tắc bảo mật hoặc RBAC.

Open Questions / Conflicts (đã được người dùng trả lời):
1. Phạm vi: triển khai thật trong repo.
2. Ngân sách: chỉ dùng free plan.
3. Môi trường: chỉ `develop`.
4. Neon auto-suspend: có xử lý trong task này.

## Inputs Reviewed

- `render.develop.yaml`
- `DEVELOP_DEPLOYMENT.md` (mục 9 Develop deployment)
- `docs/AI_AGENT_WORKFLOW.md` (định dạng Step 1)

## Actions and Evidence

- Đọc `render.develop.yaml`: service `kpi-system-develop-api`, `healthCheckPath: /health`, không khai báo plan trả phí.
- Đọc `DEVELOP_DEPLOYMENT.md`: develop dùng Render Free, Neon Free, Vercel Preview; không dùng `preDeployCommand` vì Render Free không hỗ trợ.

## Changes Made

None.

## Decisions and Rationale

- Xác định đây là task hạ tầng/vận hành, không phải thay đổi nghiệp vụ, nên không cần cập nhật LLD.
- Người dùng xác nhận chỉ dùng free plan, nên loại phương án nâng cấp Render Starter.

## Risks / Blockers

None tại bước này.

## Next Step

Step 2 - Investigate.
