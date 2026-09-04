# Step 5: Test Cases

Status: reconstructed from an earlier approved response

## Deliverable

### Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Deep health khi database sẵn sàng | App khởi tạo có `pool`, `SELECT 1` thành công | `GET /health/db` | `200`; envelope `{ success: true, data: { status: 'healthy', database: 'up' } }`; có `X-Request-ID` |
| TC02 | Deep health khi database lỗi hoặc suspend | `pool.query` throw | `GET /health/db` | `503`; `success: false`; message chung; không lộ DSN, host, stack trace |
| TC03 | Deep health khi app không có pool | App tạo không có `DATABASE_URL` | `GET /health/db` | `503`; `success: false`; không crash |
| TC04 | Health nông không đổi hành vi | App bất kỳ | `GET /health` | `200`; `data.status = 'healthy'`; không truy vấn database |
| TC05 | Deep health không yêu cầu auth | Không gửi `Authorization` | `GET /health/db` | Không trả `401/403` |
| TC06 | Deep health không ghi audit | — | `GET /health/db` | Không có lời gọi ghi audit log |
| TC07 | Deep health chỉ đọc | — | `GET /health/db` | Chỉ một truy vấn `SELECT 1` |
| TC08 | Method không hỗ trợ | — | `POST /health/db` | `404` theo envelope lỗi chuẩn |
| TC09 | OpenAPI có endpoint mới | — | `GET /api-docs.json` | Chứa path `/health/db` với response `200` và `503` |
| TC10 | Ping lặp lại ổn định | — | Gọi `GET /health/db` nhiều lần | Tất cả trả `200`; không cạn connection pool |
| TC11 | FE: GET thành công không retry | `fetch` trả `200` hợp lệ | `getApi` | Trả `payload.data`; `fetch` gọi 1 lần |
| TC12 | FE: GET retry rồi thành công | `fetch` reject 2 lần rồi `200` | `getApi` | Trả dữ liệu; `fetch` gọi 3 lần |
| TC13 | FE: GET vượt số lần retry | `fetch` luôn reject | `getApi` | Throw `ApiClientError` code `SERVER_WAKING_UP`, `statusCode 0`; `fetch` gọi 3 lần |
| TC14 | FE: timeout lần gọi đầu | `fetch` không resolve | `getApi` | Request bị abort; throw `SERVER_WAKING_UP`; không treo vô hạn |
| TC15 | FE: mutation không retry | `fetch` reject | `postApi` | Throw `NETWORK_ERROR`; `fetch` gọi 1 lần |
| TC16 | FE: PUT/PATCH/DELETE không retry | `fetch` reject | Gọi từng method | `fetch` gọi 1 lần cho mỗi method |
| TC17 | FE: 503 khi backend khởi động | `fetch` trả `503` | `getApi` | Retry theo policy; nếu vẫn `503` thì lỗi phân biệt được cho UI |
| TC18 | FE: 401 xử lý như cũ | `fetch` trả `401` | `getApi` | Xóa token và user khỏi localStorage; điều hướng `/login`; không retry |
| TC19 | FE: lỗi 4xx nghiệp vụ không retry | `fetch` trả `422` | `getApi` | Throw ngay với code từ `meta.error.code`; `fetch` gọi 1 lần |
| TC20 | FE: `Idempotency-Key` giữ nguyên | `postApi` với key | Gọi một lần | Header gửi đúng, không sinh key mới |
| TC21 | UI: thông điệp server đang khởi động | `ErrorAlert` nhận code `SERVER_WAKING_UP` | Render | Hiển thị thông điệp khởi động và nút Retry hoạt động |
| TC22 | UI: lỗi khác giữ nguyên | `ErrorAlert` nhận code khác | Render | Hiển thị message cũ |
| TC23 | Workflow keep-alive hợp lệ | — | Kiểm tra YAML | Parse hợp lệ; có `schedule` cron `0,12,24,36,48 1-11 * * 1-5`, `workflow_dispatch`, `permissions: contents: read`, `concurrency`, `environment: develop` |
| TC24 | Keep-alive không lộ secret | — | Đọc workflow và log | Không in `DEVELOP_API_BASE_URL`; không có URL trong log |
| TC25 | Keep-alive chạy thật | Secrets `develop` đã cấu hình | `workflow_dispatch` | Job thành công; Render service live sau đó |
| TC26 | Keep-alive không đụng deployment | — | Chạy đồng thời với `Deploy Develop` | Hai workflow dùng concurrency group khác nhau |
| TC27 | Regression backend | — | `npm test`, `npm run typecheck`, `npm run build` | Pass |
| TC28 | Regression frontend | — | `npm test`, `npm run typecheck`, `npm run build` | Pass |

Ghi chú phạm vi: TC25 và TC26 cần môi trường thật và chỉ được đánh dấu đã xác minh khi thực sự chạy.

## Inputs Reviewed

- Kế hoạch Step 4, `backend/test/app.test.ts`, `frontend/src/shared/api/api-client.ts`, `frontend/src/shared/components/ui.tsx`.

## Actions and Evidence

- Đọc `backend/test/app.test.ts` để tuân theo pattern `supertest` + `vitest` hiện có.

## Changes Made

None.

## Decisions and Rationale

- Tách rõ test chạy tự động (TC01-TC24, TC27, TC28) và test cần môi trường thật (TC25, TC26).

## Risks / Blockers

None.

## Next Step

Step 6 - Implement.
