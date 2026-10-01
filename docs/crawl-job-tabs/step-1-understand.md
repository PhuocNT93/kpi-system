# Step 1: Understand

Status: produced during this step

## Deliverable

## Task Understanding

Goal: Bổ sung Tab Scripts (Đăng ký, quản lý phiên bản Script và gắn KPI tương ứng) vào màn hình Automated KPI Crawling; đồng thời tham khảo các collector hiện có (jira-crawler và blueprint.collector.ts) để tạo seed data mẫu gồm KPI criteria, connector credentials và script thu thập dữ liệu cho Jira & Blueprint.

Expected Behavior:
- Màn hình Crawl Jobs tại `/admin/crawl-jobs` được nâng cấp từ 3 tabs thành 4 tabs: `Jobs`, `Executions`, `Data Review`, và `Scripts`.
- Tab Scripts:
  - Cho phép người dùng (`HR_ADMIN` / `SYSTEM_ADMIN`) xem danh sách script đã có cùng trạng thái (Draft / Published).
  - Cho phép đăng ký script mới: nhập mã script, tên, source system (`JIRA`, `BLUEPRINT`, `GOOGLE_SHEET`), nội dung mã JavaScript thu thập dữ liệu (sandbox-compatible), và gắn các KPI criteria tương ứng.
  - Hỗ trợ thao tác Publish Script: sau khi kiểm tra, publish phiên bản script để xuất hiện trong dropdown chọn script tại Tab Jobs.
- Tích hợp khi tạo Job (Tab Jobs):
  - Khi chọn Script đã publish, hệ thống tự động gợi ý/gắn danh sách KPI criteria tương ứng của script vào Job.
- Seed Data mẫu (Jira & Blueprint):
  - Tham khảo logic thu thập của `jira-crawler` và `blueprint.collector.ts`:
    - Seed KPI Criteria mẫu liên quan đến Jira (Issue resolution, bug rate, story points) và Blueprint (Task completion, commit/merge activities).
    - Seed Connector Credential references (tham chiếu biến môi trường Jira và Blueprint mà không lưu raw secret).
    - Seed sẵn ít nhất 2 Published Scripts mẫu: 1 script chuẩn hóa dữ liệu từ Jira API và 1 script chuẩn hóa dữ liệu từ Blueprint API.
- Worker & Queue:
  - Tiếp tục sử dụng PostgreSQL-only queue (`FOR UPDATE SKIP LOCKED`) và In-Process Worker chạy ngầm trong backend đã tích hợp.

Acceptance Criteria:
1. Giao diện `/admin/crawl-jobs` hiển thị đầy đủ 4 tabs: `Jobs`, `Executions`, `Data Review`, và `Scripts`.
2. Tab Scripts cho phép xem danh sách script, tạo draft script, gắn KPI criteria và publish script phiên bản mới.
3. Tab Jobs hiển thị danh sách script đã publish và tự động đồng bộ danh sách KPI criteria được liên kết khi người dùng chọn script.
4. Backend cung cấp đầy đủ API hoặc seed script tự động nạp các KPI criteria, credential references và script mẫu cho cả Jira và Blueprint.
5. Mã script mẫu tuân thủ nghiêm ngặt sandbox `isolated-vm` (không truy cập Node filesystem, bắt buộc output cấu trúc chuẩn `{ records: [{ employee_id, criterion_id, value, ... }] }`).
6. Đảm bảo toàn bộ test case hiện có (backend 811+ tests, frontend tests) và typecheck đều pass, không gây regression lên luồng CSV import hoặc Authentication.

Out of Scope:
- Trình soạn thảo IDE phức tạp với code intellisense (chỉ cần form code editor textarea với font monospace, validation cú pháp và preview rõ ràng).
- Live API calls đến server production thực tế nếu môi trường thiếu token/mật khẩu thật (chạy qua mock sandbox validation hoặc staging).

Business Rules Involved:
- Script Immutability: Script sau khi `PUBLISH` là bất biến (immutable), không được sửa đổi trực tiếp; mọi thay đổi phải tạo một version mới.
- KPI Mapping: Một script có thể ánh xạ đến một hoặc nhiều KPI criteria.
- Credential Safety: Tuyệt đối không lưu raw credential / password trong script hoặc source config; chỉ lưu reference trỏ tới biến môi trường.
- Sandbox Security: Script chỉ chạy trong môi trường sandbox cô lập (`isolated-vm`), bị giới hạn thời gian (timeout) và bộ nhớ (memory limit), không có quyền truy cập hệ thống file hoặc network tùy tiện ngoài allowlist.
- RBAC: `HR_ADMIN` có toàn quyền cấu hình; `SYSTEM_ADMIN` quản lý Scripts/Credentials; `MANAGER` chỉ review dữ liệu theo team scope.

Open Questions / Conflicts:
- Script mẫu Jira & Blueprint được tự động chạy trong lệnh `npm run seed` của backend và qua migration/seed script độc lập.

## Inputs Reviewed
- User requirement update: Add script registration tab, map KPI criteria, and seed sample scripts/criteria from Jira & Blueprint collectors.
- LLD Section 15.
- Existing collector implementations (`blueprint.collector.ts`, `jira-crawler`).

## Actions and Evidence
- Documented expanded scope and task understanding approved by user.

## Changes Made
- Updated Step 1 artifact with the new scope and acceptance criteria.

## Decisions and Rationale
- Support 4 tabs in Crawl Jobs UI.
- Use existing `isolated-vm` execution structure.

## Risks / Blockers
- None.

## Next Step
- Execute Step 6 implementation per approved Step 4 plan.