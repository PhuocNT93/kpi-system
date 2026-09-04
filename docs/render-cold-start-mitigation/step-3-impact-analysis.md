# Step 3: Impact Analysis

Status: reconstructed from an earlier approved response

## Deliverable

### Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | MEDIUM | `frontend/src/shared/api/api-client.ts` thêm timeout và retry có kiểm soát, thêm mã lỗi `SERVER_WAKING_UP`. Mọi màn hình dùng `getApi/postApi/...` đều hưởng thay đổi; không đổi chữ ký hàm hay kiểu trả về. |
| Backend | LOW | Thêm endpoint deep health `GET /health/db` trong `backend/src/app.ts`. Không chạm module nghiệp vụ. |
| Database | LOW | Không migration, không đổi schema. Chỉ thêm truy vấn `SELECT 1` định kỳ để chống Neon auto-suspend. |
| API | LOW | Không đổi contract API nghiệp vụ. Endpoint mới public read-only, phải cập nhật `backend/src/config/swagger.ts`. |
| RBAC / Scope | NONE | Không chạm permission, role, scope. Endpoint không trả dữ liệu nghiệp vụ và không nhận input người dùng. |
| Workflow | NONE | Không chạm evaluation workflow. Workflow GitHub Actions mới tách khỏi `develop.yml`. |
| Audit | NONE | Keep-alive không ghi audit log, không tạo domain event. |
| Concurrency | LOW | Cron ping có thể trùng thời điểm deploy; dùng concurrency group riêng và request GET idempotent. |
| Performance | MEDIUM (cải thiện) | Loại bỏ cold start 30-60 giây trong giờ làm việc; đánh đổi bằng Render instance-hours và Neon compute-hours. |
| Historical Data | NONE | Không chạm snapshot, version, dữ liệu lịch sử. |

Potential Risks:
1. Quota Render Free 750 instance-hours mỗi tháng dùng chung toàn account; ping 24/7 tiêu gần hết. Giảm thiểu: chỉ ping trong khung giờ làm việc.
2. Scheduled workflow của GitHub bị vô hiệu hóa sau 60 ngày repo im lặng và có thể chạy trễ. Giảm thiểu: interval nhỏ hơn ngưỡng 15 phút và giữ fallback UX ở frontend.
3. Giữ service free luôn thức là hành vi lách giới hạn free tier; chấp nhận cho môi trường develop nội bộ.
4. Endpoint health chạm database có thể làm health check Render fail khi Neon suspend. Giảm thiểu: giữ `healthCheckPath: /health` shallow và dùng endpoint sâu riêng.
5. Rò rỉ thông tin qua endpoint public. Giảm thiểu: chỉ trả trạng thái, không trả chi tiết lỗi hay thông tin kết nối.
6. URL API là secret; workflow phải đọc từ `DEVELOP_API_BASE_URL`, không hard-code, không in ra log.
7. Retry ở frontend có thể nhân đôi request ghi. Giảm thiểu: chỉ retry `GET`.
8. Timeout quá ngắn sẽ hủy request hợp lệ trong lúc cold start. Giảm thiểu: timeout dài cho lần gọi đầu.

Required ADR / Clarification:
- Không xung đột LLD; không cần ADR mới.
- Cần xác nhận khung giờ ping và việc thêm endpoint `GET /health/db` (đã được người dùng duyệt ở Step 4).

## Inputs Reviewed

- Kết quả Step 2 và các file đã liệt kê ở đó.

## Actions and Evidence

- Phân tích dựa trên nội dung đã đọc ở Step 2; không chạy lệnh mới trong bước này.

## Changes Made

None.

## Decisions and Rationale

- Chọn cách tiếp cận hai lớp: keep-alive giảm tần suất cold start, UX fallback xử lý các lần cold start còn sót.

## Risks / Blockers

None chặn.

## Next Step

Step 4 - Plan.
