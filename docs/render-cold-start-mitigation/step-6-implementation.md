# Step 6: Implementation

Status: produced during this step

## Deliverable

### Implementation

Changes Made:
- `backend/src/app.ts`: thêm endpoint `GET /health/db` chạy một truy vấn `SELECT 1`; trả `200` với `{ status: 'healthy', database: 'up' }` khi thành công và `503` với mã lỗi `DATABASE_UNAVAILABLE` khi không có pool hoặc query thất bại; import thêm `sendFailure`. `GET /health` giữ nguyên và vẫn không chạm database.
- `backend/src/config/swagger.ts`: thêm mô tả OpenAPI cho `/health/db` với response `200` và `503` (dùng `ApiErrorResponse`).
- `backend/test/app.test.ts`: thêm test cho `/health/db` (thành công, lỗi database không lộ chi tiết, không có pool, không cần auth, `POST` trả 404, 5 lần ping liên tiếp) và test `/health` không truy vấn database; bổ sung assert `/api-docs.json` chứa `/health/db`.
- `.github/workflows/develop-keepalive.yml` (mới): workflow `Keep Develop Awake`, cron `0,12,24,36,48 1-11 * * 1-5` cộng `workflow_dispatch`, `permissions: contents: read`, `concurrency: develop-keepalive`, `environment: develop`; gọi `curl --fail --silent --show-error --output /dev/null --max-time 90 --retry 2 --retry-delay 15 --retry-connrefused "${DEVELOP_API_BASE_URL%/}/health/db"`; fail sớm nếu secret trống.
- `frontend/src/shared/api/api-client.ts`: thêm `fetchWithTimeout` (AbortController + timeout 90s cho lần đầu, 20s về sau) và `requestApi` dùng chung; `getApi` retry tối đa 2 lần với backoff cho lỗi mạng, timeout, và `503`; các hàm ghi (`postApi`, `putApi`, `patchApi`, `deleteApi`) không retry; thêm mã lỗi `SERVER_WAKING_UP`. Chữ ký các hàm public không đổi.
- `frontend/src/shared/components/ui.tsx`: `ErrorAlert` hiển thị thông điệp "server đang khởi động" khi lỗi có mã `SERVER_WAKING_UP`; các lỗi khác giữ nguyên hành vi.
- `frontend/src/shared/api/api-client.test.ts`: thêm test cho retry GET, hết lượt retry, retry `503`, không retry lỗi nghiệp vụ, không retry `401`, không retry mutation, và giữ nguyên `Idempotency-Key`.
- `frontend/src/shared/components/ui.test.tsx` (mới): test `ErrorAlert` cho `SERVER_WAKING_UP` và cho lỗi khác.
- `DEVELOP_DEPLOYMENT.md`: thêm mục 10 "Develop free-tier cold start" mô tả workflow keep-alive, endpoint `/health/db`, cách đổi lịch, giới hạn quota, hành vi frontend, và các sự cố thường gặp.
- `docs/render-cold-start-mitigation/`: artifact Step 0-6 và `frontend-user-guide.md`.

Decisions Applied:
- Giữ `healthCheckPath: /health` trong `render.develop.yaml` không đổi để health check của Render không phụ thuộc trạng thái Neon; keep-alive dùng endpoint sâu riêng.
- Endpoint `/health/db` chỉ trả trạng thái, không trả message của driver, để tránh lộ host hoặc thông tin kết nối.
- Chỉ retry `GET` nhằm tuân thủ `docs/FRONTEND_REACT_RULES.md`: không tự động lặp lại thao tác ghi.
- Timeout 90 giây chỉ áp dụng cho tới khi client chạm được server lần đầu, sau đó giảm về 20 giây để không che giấu lỗi thật.
- Workflow keep-alive tách riêng khỏi `develop.yml` với concurrency group riêng để không ảnh hưởng luồng deploy.

## Inputs Reviewed

- `backend/src/app.ts`, `backend/src/api/http-response.ts`, `backend/src/config/database.config.ts`, `backend/src/config/swagger.ts`, `backend/test/app.test.ts`
- `frontend/src/shared/api/api-client.ts`, `frontend/src/shared/components/ui.tsx`, `frontend/src/shared/api/api-client.test.ts`, `frontend/package.json`, `frontend/vite.config.ts`
- `.github/workflows/develop.yml`, `DEVELOP_DEPLOYMENT.md`
- `docs/FRONTEND_REACT_RULES.md`, `docs/BACKEND_NODE_RULES.md`

## Actions and Evidence

- `npx vitest run test/app.test.ts` trong `backend`: 10 test pass, gồm 6 test mới cho `/health/db`.
- `npx vitest run src/shared` trong `frontend`: 21 test pass.
- `npm test; npm run typecheck; npm run lint` trong `frontend`: 42 test pass, typecheck sạch; `eslint .` báo 82 lỗi và 1 cảnh báo, tất cả nằm ở các file có sẵn (`features/...`, `shared/auth/AuthContext.tsx`) và đều tồn tại trước thay đổi này; không có lỗi nào trong các file được sửa ở task này.
- `npm test; npm run typecheck; npm run build` trong `backend`: 315 test pass, 30 skipped; typecheck và build thành công.
- `python -c "import yaml,json;..."` xác nhận `.github/workflows/develop-keepalive.yml` parse hợp lệ với cron `0,12,24,36,48 1-11 * * 1-5`, `permissions.contents=read`, `concurrency.group=develop-keepalive`, `environment: develop`.
- `git status --porcelain` và `git diff --stat` xác nhận 7 file sửa và 3 mục mới (workflow, thư mục docs, test UI).

## Changes Made

Xem danh sách trong phần Deliverable.

## Decisions and Rationale

Xem "Decisions Applied" trong phần Deliverable.

## Risks / Blockers

- TC25 (chạy `workflow_dispatch` thật) và TC26 (chạy đồng thời với `Deploy Develop`) chưa được xác minh vì cần môi trường GitHub và Render thật; sẽ ghi rõ trạng thái ở Step 7.
- `eslint` của frontend đang fail sẵn từ trước trên các file không thuộc phạm vi task; không sửa để tránh thay đổi ngoài phạm vi được duyệt.

## Next Step

Step 7 - Test.
