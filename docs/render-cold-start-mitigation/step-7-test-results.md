# Step 7: Test Results

Status: produced during this step

## Deliverable

### Test Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Unit (backend, endpoint mới) | `npx vitest run test/app.test.ts` trong `backend` | PASS | 10/10 pass; bao phủ TC01, TC02, TC03, TC04, TC05, TC08, TC09, TC10 |
| Unit (frontend, api client và UI) | `npx vitest run src/shared` trong `frontend` | PASS | 21/21 pass; bao phủ TC11-TC13, TC17-TC22 |
| Integration (keep-alive thật) | `workflow_dispatch` trên GitHub Actions | NOT EXECUTED | TC25, TC26 cần GitHub Environment `develop` và Render thật |
| Regression (backend) | `npm test` trong `backend` | PASS | 315 pass, 30 skipped |
| Regression (frontend) | `npm test` trong `frontend` | PASS | 42 pass |
| Type Check (backend) | `npm run typecheck` và `npm run build` | PASS | không lỗi |
| Type Check (frontend) | `npm run typecheck` | PASS | không lỗi |
| Lint (file thay đổi, backend) | `npx eslint src/app.ts src/config/swagger.ts test/app.test.ts` | PASS | exit code 0 |
| Lint (file thay đổi, frontend) | `npx eslint src/shared/api/api-client.ts src/shared/api/api-client.test.ts src/shared/components/ui.tsx src/shared/components/ui.test.tsx` | PASS | exit code 0 |
| Lint (toàn repo) | `npm run lint` ở cả hai package | FAIL (có sẵn từ trước) | Lỗi `no-explicit-any` và `no-unused-vars` ở file ngoài phạm vi task |
| Migration check | — | NOT APPLICABLE | Task không thêm hoặc sửa migration |
| YAML workflow | `python -c "import yaml; yaml.safe_load(...)"` | PASS | TC23 hợp lệ; TC24 xác minh bằng đọc file |

Failures / Blockers:
- Không có blocker cho code.
- TC25 và TC26 chỉ xác minh được sau khi merge và chạy workflow trên GitHub.
- `npm run lint` toàn repo đã fail trước task này; không sửa để giữ đúng phạm vi đã duyệt.

## Inputs Reviewed

- Test case đã duyệt ở Step 5; mã nguồn đã sửa ở Step 6.

## Actions and Evidence

- `npx vitest run test/app.test.ts` (backend): "Test Files 1 passed (1) / Tests 10 passed (10)".
- `npx vitest run src/shared` (frontend): "Test Files 4 passed (4) / Tests 21 passed (21)".
- `npm test` (frontend): "Test Files 7 passed (7) / Tests 42 passed (42)".
- `npm test` (backend): "Test Files 28 passed | 6 skipped (34) / Tests 315 passed | 30 skipped (345)".
- `npm run typecheck` và `npm run build` (backend): không có output lỗi.
- `npm run typecheck` (frontend): không có output lỗi.
- `npx eslint` trên từng file đã sửa ở cả hai package: exit code 0.
- `npm run lint` (frontend): "82 problems (82 errors, 1 warning)" ở `src/features/**` và `src/shared/auth/AuthContext.tsx`.
- `npm run lint` (backend): lỗi tương tự ở `src/modules/**`, `src/shared/database/**`.
- `python -c "import yaml,json; ..."` in ra cấu trúc workflow đã parse với cron, permissions, concurrency, environment đúng như thiết kế.

## Changes Made

Không sửa mã nguồn trong bước này; không có test nào thất bại cần khắc phục.

## Decisions and Rationale

- TC06 và TC07 được xác minh bằng đọc code cộng assert trong TC01 (`query` gọi đúng một lần với `SELECT 1`), thay vì thêm test giả lập audit service.
- TC14 (timeout 90 giây) không được viết test riêng vì cần điều khiển timer giả xuyên nhiều vòng retry, dễ tạo test giòn; ghi nhận là khoảng trống, không tuyên bố đã kiểm.
- TC15 và TC16 gộp thành một test kiểm tra cả bốn method ghi.

## Risks / Blockers

- Khoảng trống test cho hành vi timeout; rủi ro thấp vì nhánh lỗi chung đã được TC13 bao phủ.
- Xác minh môi trường thật còn treo (TC25, TC26).

## Next Step

Step 8 - Code Review.
