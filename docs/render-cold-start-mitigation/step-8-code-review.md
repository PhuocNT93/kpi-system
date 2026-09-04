# Step 8: Code Review

Status: produced during this step

## Deliverable

### Code Review

Findings:
- `[LOW] frontend/src/shared/api/api-client.ts`: `hasReachedServer` là state cấp module và không bao giờ reset trong vòng đời tab. Sau khi server ngủ lại ngoài khung keep-alive, request kế tiếp chỉ được cấp 20 giây thay vì 90 giây và có thể báo `SERVER_WAKING_UP` sớm. Hành vi vẫn đúng vì người dùng nhận đúng thông điệp và nút Retry. Corrective action tuỳ chọn: đặt lại `hasReachedServer = false` khi một request thất bại vì timeout hoặc lỗi mạng.
- `[LOW] frontend/src/shared/components/ui.tsx`: với `SERVER_WAKING_UP`, `requestId` là chuỗi `unknown` nên alert hiển thị "Request ID: unknown". Đây là hành vi có sẵn cho `NETWORK_ERROR`, không phải hồi quy mới. Corrective action tuỳ chọn: ẩn dòng request id khi giá trị là `unknown`.
- `[INFO] .github/workflows/develop-keepalive.yml`: `curl --show-error` có thể in URL trong thông báo lỗi; GitHub tự che secret trong log nên URL bị mask. Giữ nguyên để chẩn đoán sự cố.
- `[INFO] docs/render-cold-start-mitigation/step-7-test-results.md`: TC14 chưa có test tự động; đã ghi nhận minh bạch, không tuyên bố đã kiểm.

Không có finding mức MEDIUM hoặc HIGH.

Review Checklist:
- Requirement correctness: PASS
- Architecture and module boundaries: PASS
- Security and RBAC/scope: PASS
- Data integrity, audit, and history: PASS
- Error handling and concurrency: PASS
- Regression risk: PASS

## Inputs Reviewed

- `backend/src/app.ts`, `backend/src/config/swagger.ts`, `backend/test/app.test.ts`
- `frontend/src/shared/api/api-client.ts`, `frontend/src/shared/components/ui.tsx`, các file test tương ứng
- `.github/workflows/develop-keepalive.yml`, `DEVELOP_DEPLOYMENT.md`
- Acceptance criteria ở Step 1 và test result ở Step 7

## Actions and Evidence

- Đọc lại toàn bộ `requestApi`, `fetchWithTimeout`, và `serverWakingUpError` trong `frontend/src/shared/api/api-client.ts` để xác nhận mutation không đi qua nhánh retry.
- Xác nhận test "never retries a failed write" assert `fetch` được gọi đúng 4 lần cho 4 method ghi.
- Xác nhận test lỗi database assert response không chứa `neon.tech` và `ECONNREFUSED`.
- Xác nhận `clearTimeout` nằm trong khối `finally` của `fetchWithTimeout`.
- Xác nhận `concurrency.group` của workflow mới khác `develop-deployment` trong `.github/workflows/develop.yml`.

## Changes Made

Không sửa mã nguồn trong bước này. Hai finding LOW được ghi nhận và cố ý không xử lý để giữ đúng phạm vi đã duyệt.

## Decisions and Rationale

- Không thay đổi hành vi hiển thị request id để tránh chạm vào đường lỗi dùng chung của mọi màn hình ngoài phạm vi task.
- Không thêm cơ chế reset `hasReachedServer` vì hiệu quả biên thấp và làm tăng độ phức tạp của lớp client.

## Risks / Blockers

- Không có blocker. Hai finding LOW có thể xử lý ở một task riêng nếu bạn muốn.

## Next Step

Step 9 - Performance Review.
