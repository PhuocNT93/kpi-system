# Step 4: Plan

Status: reconstructed from an earlier approved response, including the approved revision to a 12-minute interval

## Deliverable

### Implementation Plan

Chiến lược tổng thể (Free plan, chỉ `develop`): keep-alive theo khung giờ làm việc kết hợp fallback UX ở frontend; không thay đổi nghiệp vụ.

1. **What:** Thêm endpoint deep health `GET /health/db` trả envelope chuẩn với `data: { status, database }`, chạy đúng một truy vấn `SELECT 1`; trả `200` khi database up, `503` khi down; không lộ chi tiết lỗi hay thông tin kết nối.
   **Where:** `backend/src/app.ts`, đăng ký cạnh `/health`, dùng `pool` sẵn có trong `createApp`.
   **Why:** `/health` không chạm database nên ping nó chỉ đánh thức Render, không đánh thức Neon compute.
   **Tests:** `backend/test/app.test.ts` — 200 khi query thành công, 503 khi query lỗi, 503 khi không có pool, `/health` giữ nguyên hành vi.

2. **What:** Cập nhật OpenAPI spec cho `/health/db`.
   **Where:** `backend/src/config/swagger.ts`, ngay sau mục `/health`.
   **Why:** `docs/BACKEND_NODE_RULES.md` yêu cầu contract-first.
   **Tests:** Kiểm tra `/api-docs.json` chứa path `/health/db`.

3. **What:** Thêm workflow `.github/workflows/develop-keepalive.yml` chạy `schedule` mỗi 12 phút trong khung giờ làm việc và `workflow_dispatch`; gọi `curl --fail --max-time 90 --retry 2` tới `/health/db`; `permissions: contents: read`; concurrency group riêng; `environment: develop`.
   **Where:** File workflow mới, tách khỏi `.github/workflows/develop.yml`.
   **Why:** Giữ Render không spin down (ngưỡng 15 phút) và Neon không suspend trong giờ làm việc, đồng thời giới hạn tiêu thụ instance-hours.
   **Tests:** Xác minh cú pháp YAML; chạy `workflow_dispatch` thủ công ở Step 7 nếu môi trường sẵn sàng.

4. **What:** Thêm timeout và retry có kiểm soát vào API client; retry tối đa 2 lần với backoff cho riêng `GET` khi gặp lỗi mạng, timeout, hoặc `503`; thêm mã lỗi `SERVER_WAKING_UP`; giữ nguyên chữ ký các hàm.
   **Where:** `frontend/src/shared/api/api-client.ts`.
   **Why:** Tránh treo vô hạn khi cold start và phân biệt trạng thái khởi động với lỗi mạng thật; không retry mutation để tránh ghi trùng.
   **Tests:** `frontend/src/shared/api/api-client.test.ts` mới với `fetch` mock.

5. **What:** Hiển thị thông điệp "server đang khởi động" khi gặp `SERVER_WAKING_UP`.
   **Where:** `ErrorAlert` trong `frontend/src/shared/components/ui.tsx`.
   **Why:** Sửa một chỗ dùng chung thay vì từng trang.
   **Tests:** Test render `ErrorAlert` cho mã lỗi mới và cho mã lỗi khác.

6. **What:** Bổ sung tài liệu về cold start free-tier, workflow keep-alive, khung giờ, giới hạn quota, và cảnh báo GitHub tắt scheduled workflow.
   **Where:** `DEVELOP_DEPLOYMENT.md`.
   **Why:** Acceptance criteria 1 và 2.
   **Tests:** Không áp dụng.

7. **What:** Lưu artifact quy trình và `frontend-user-guide.md`.
   **Where:** `docs/render-cold-start-mitigation/`.
   **Why:** `docs/AI_AGENT_WORKFLOW.md` bắt buộc khi task có thay đổi frontend.
   **Tests:** Không áp dụng.

Không làm: dịch vụ ping bên thứ ba, self-ping bằng `setInterval` trong backend, nâng plan trả phí.

## Inputs Reviewed

- `docs/FRONTEND_REACT_RULES.md` (retry và idempotency key), `docs/BACKEND_NODE_RULES.md` (envelope), kết quả Step 2 và Step 3.

## Actions and Evidence

- `grep_search` trong `docs/FRONTEND_REACT_RULES.md` xác nhận quy tắc: retry idempotent chỉ khi có `Idempotency-Key` chủ đích.
- `grep_search` trong `docs/BACKEND_NODE_RULES.md` xác nhận envelope bắt buộc và `request_id`.

## Changes Made

None.

## Decisions and Rationale

- Người dùng chọn interval 12 phút thay vì 10 phút; cron `0,12,24,36,48 1-11 * * 1-5` (UTC) tương ứng thứ Hai đến thứ Sáu, khoảng 08:00-18:48 GMT+7, vẫn nhỏ hơn ngưỡng idle 15 phút của Render.
- Người dùng duyệt endpoint public `GET /health/db`.

## Risks / Blockers

- Keep-alive không đảm bảo tuyệt đối do độ trễ của GitHub Actions scheduler; đã bù bằng UX fallback.

## Next Step

Step 5 - Define Test Cases.
