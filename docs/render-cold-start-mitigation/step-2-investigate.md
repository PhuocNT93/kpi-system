# Step 2: Investigate

Status: reconstructed from an earlier approved response

## Deliverable

### Investigation

Relevant Documents:
- `usage.md`, `docs/AI_AGENT_WORKFLOW.md` — quy trình bắt buộc.
- `DEVELOP_DEPLOYMENT.md` mục 9 — develop dùng Render Free, Neon Free, không dùng `preDeployCommand`.
- `docs/develop-ci-cd/step-9-performance-review.md` và `step-10-final-verification.md` — cold start free-tier đã được ghi nhận là rủi ro vận hành nhưng chưa xử lý.
- `docs/FRONTEND_REACT_RULES.md` — chuẩn API client, error state, idempotency key cho retry.
- `docs/BACKEND_NODE_RULES.md` — envelope response bắt buộc và contract-first.

Owning module / hạ tầng hiện tại:
- `render.develop.yaml`: `type: web`, `runtime: node`, `rootDir: backend`, `healthCheckPath: /health`, env `NODE_ENV=development`, `PORT=10000`, `DATABASE_URL` (`sync: false`).
- `.github/workflows/develop.yml`: job `deploy-backend` gọi `RENDER_DEPLOY_HOOK_URL`; `concurrency: develop-deployment`; `permissions: contents: read`; các job gate theo `github.ref == 'refs/heads/develop'`; environment `develop` chứa secret `DEVELOP_API_BASE_URL`, `DEVELOP_DATABASE_URL`.
- `backend/src/app.ts`: `GET /health` trả `sendSuccess(200, 'Service is healthy.', { status: 'healthy' })`, không chạm database, không auth, không audit.
- `frontend/src/shared/api/api-client.ts`: `fetch` trần, không timeout, không retry; lỗi mạng trả `ApiClientError('NETWORK_ERROR', statusCode 0)`.
- `frontend/src/shared/components/ui.tsx`: `ErrorAlert` dùng chung, hiển thị `error.message` và `requestId`, có nút Retry.

Current behavior (nguyên nhân vấn đề):
1. Render Free spin down web service sau khoảng 15 phút không có inbound request; request kế tiếp chịu cold start khoảng 30-60 giây.
2. Neon Free auto-suspend compute sau khoảng 5 phút idle, cộng thêm vài giây cho kết nối đầu tiên.
3. Trong lúc cold start, `fetch` treo lâu hoặc lỗi, frontend chỉ hiển thị "Network Error".

Điểm có thể tái sử dụng:
- `GET /health` rẻ và public, phù hợp làm mục tiêu ping cho Render, nhưng không chạm database nên không giữ Neon thức.
- `.github/workflows/develop.yml` cung cấp pattern GitHub Actions với `environment: develop` và secrets để tái sử dụng cho workflow keep-alive.

Ràng buộc kỹ thuật:
- GitHub Actions `schedule` tối thiểu 5 phút, có thể trễ, và bị vô hiệu hóa sau 60 ngày repo không hoạt động.
- Render Free có hạn mức 750 instance-hours mỗi tháng cho toàn account; ping 24/7 tiêu khoảng 730 giờ.
- Không được commit secret; URL API develop nằm trong secret `DEVELOP_API_BASE_URL`.

Tests liên quan:
- `backend/test/app.test.ts` có test cho `GET /health` và cho `/api-docs.json`.
- Frontend chưa có test cho `api-client.ts`.

Gaps / rủi ro phát hiện:
- Repo chưa có cơ chế keep-alive nào.
- `/health` không kiểm tra database nên health check Render vẫn xanh khi Neon suspend.
- API client không có timeout nên tab treo khi Render cold start.

## Inputs Reviewed

- `backend/src/app.ts`, `backend/src/config/swagger.ts`, `backend/test/app.test.ts`
- `frontend/src/shared/api/api-client.ts`, `frontend/src/shared/components/ui.tsx`
- `.github/workflows/develop.yml`, `render.develop.yaml`, `DEVELOP_DEPLOYMENT.md`
- `docs/FRONTEND_REACT_RULES.md`, `docs/BACKEND_NODE_RULES.md`, `docs/develop-ci-cd/*`

## Actions and Evidence

- `grep_search` `"/health"` trong `backend/src` trả 2 kết quả: `backend/src/app.ts` dòng 112 và `backend/src/config/swagger.ts` dòng 530.
- `file_search` `.github/workflows/*.yml` trả duy nhất `.github/workflows/develop.yml`.
- `grep_search` `"VITE_API_BASE_URL|fetch\\(|timeout"` trong `frontend/src` cho thấy `api-client.ts` gọi `fetch` 5 lần, không có tuỳ chọn timeout.
- `grep_search` `"cold start|keep-alive|spin down"` trong `*.md` chỉ khớp các ghi chú rủi ro trong `docs/develop-ci-cd/`.

## Changes Made

None.

## Decisions and Rationale

- Giữ `healthCheckPath: /health` ở dạng shallow để health check của Render không phụ thuộc trạng thái Neon.
- Cần một endpoint deep health riêng cho mục đích keep-alive database.

## Risks / Blockers

None tại bước này.

## Next Step

Step 3 - Impact Analysis.
