# Sequence Diagrams — Employee Performance Evaluation Management System

> **Nguồn tham chiếu:** `LLD_Employee_Performance_Evaluation_System_v1.2.md`. Tài liệu này minh họa **toàn bộ luồng nghiệp vụ chính** của hệ thống dưới dạng Mermaid sequence diagram, mỗi luồng kèm số mục LLD tương ứng để tra cứu chi tiết (entity, API, business rule).
>
> **Quy ước ký hiệu:**
> - `actor` = con người (Employee/Manager/HR-Admin/System Admin).
> - `participant` = thành phần hệ thống (Frontend, các Service theo module ở LLD mục 8, DB, thành phần ngoài như Google).
> - Mọi diagram đều tuân thủ 2 nguyên tắc xuyên suốt LLD: **(1)** mọi write ảnh hưởng điểm/weight/quyết định đều ghi `audit_log` cùng transaction (xem Diagram 10); **(2)** dữ liệu đã `LOCKED`/`PUBLISHED` không bao giờ bị ghi đè ngầm.

## Mục lục

1. [Đăng nhập — Google Workspace SSO](#1-đăng-nhập--google-workspace-sso)
2. [HR cấu hình Criterion & Evaluation Template](#2-hr-cấu-hình-criterion--evaluation-template)
3. [Mở Evaluation Cycle → sinh Evaluation instance](#3-mở-evaluation-cycle--sinh-evaluation-instance)
4. [Employee Self-Assessment (bắt buộc)](#4-employee-self-assessment-bắt-buộc)
5. [Manager Assessment → Scoring Engine tính điểm](#5-manager-assessment--scoring-engine-tính-điểm)
6. [Review → Calibration (optional) → Approve → Auto-Publish](#6-review--calibration-optional--approve--auto-publish)
7. [CSV Import hàng loạt](#7-csv-import-hàng-loạt)
8. [Xem Report (Employee / Manager / HR)](#8-xem-report-employee--manager--hr)
9. [Lock Cycle](#9-lock-cycle)
10. [Audit Log — cross-cutting pattern](#10-audit-log--cross-cutting-pattern)

---

## 1. Đăng nhập — Google Workspace SSO

> Tham chiếu: LLD mục 21 (Security), mục 10.8 (`user_account`).

```mermaid
sequenceDiagram
    actor U as Employee/Manager/HR/Admin
    participant FE as Frontend
    participant Auth as Auth Module
    participant Google as Google OAuth/OIDC
    participant DB

    U->>FE: Click "Sign in with company Google account"
    FE->>Google: Redirect tới consent screen (hd=company_domain)
    U->>Google: Chọn account công ty, cấp quyền
    Google-->>FE: Redirect callback kèm authorization code
    FE->>Auth: POST /auth/google/callback { code }
    Auth->>Google: Exchange code lấy ID token (server-to-server)
    Google-->>Auth: ID token (JWT ký bởi Google)
    Auth->>Auth: Verify chữ ký + email_verified=true
    Auth->>Auth: Verify email domain == company domain (server-side)
    alt Sai domain
        Auth-->>FE: 403 INVALID_DOMAIN
    else Đúng domain nhưng không có employee tương ứng
        Auth->>DB: tìm employee theo email — không thấy
        Auth-->>FE: 403 EMPLOYEE_NOT_PROVISIONED
        Auth->>DB: audit_log(action=LOGIN_DENIED)
    else Hợp lệ
        Auth->>DB: tìm/tạo user_account (liên kết employee_id, lưu google_sub)
        Auth->>DB: audit_log(action=CREATE nếu lần đầu, LOGIN nếu đã có)
        Auth-->>FE: session JWT (access + refresh token)
    end
    FE->>Auth: GET /auth/me
    Auth-->>FE: employee_id, access_role, team scope
```

---

## 2. HR cấu hình Criterion & Evaluation Template

> Tham chiếu: LLD mục 11 (Precedence & weight validation), mục 16 (API), mục 20 (Template Builder UI).

```mermaid
sequenceDiagram
    actor HR as HR/Admin
    participant FE as Frontend (Template Builder)
    participant TplSvc as Template Service
    participant DB

    HR->>FE: Tạo Criterion mới / chọn Criterion có sẵn
    FE->>TplSvc: POST /criteria  |  POST /criteria/{id}/versions
    TplSvc->>DB: insert criterion / criterion_version (weight, rule_config, level 1-5)

    HR->>FE: Tạo Evaluation Template, thêm Criterion + weight
    FE->>TplSvc: POST /evaluation-templates
    FE->>TplSvc: PUT /evaluation-templates/{id}/versions/{v}/criteria
    TplSvc->>DB: upsert template_criterion (draft, chưa resolve effective_weight)

    HR->>FE: Click "Validate"
    FE->>TplSvc: POST /evaluation-templates/{id}/versions/{v}/validate
    TplSvc->>TplSvc: Σ effective_weight (Global→Role→Team→Template) có = 100%?
    alt Weight ≠ 100%
        TplSvc-->>FE: 422 WEIGHT_MISMATCH (thiếu/dư bao nhiêu %)
    else Weight = 100%
        TplSvc-->>FE: 200 OK (preview effective_weight từng criterion)
    end

    HR->>FE: Click "Publish"
    FE->>TplSvc: POST /evaluation-templates/{id}/versions/{v}/publish
    TplSvc->>TplSvc: resolve precedence, chốt effective_weight (denormalized)
    TplSvc->>DB: template_version.status = PUBLISHED (immutable từ đây)
    TplSvc->>DB: audit_log(action=PUBLISH, entity=TEMPLATE_VERSION)
    TplSvc-->>FE: Published — sẵn sàng gắn vào Evaluation Cycle
```

---

## 3. Mở Evaluation Cycle → sinh Evaluation instance

> Tham chiếu: LLD mục 10.5 (evaluation/evaluation_item), mục 14 (Workflow — trạng thái khởi tạo).

```mermaid
sequenceDiagram
    actor HR as HR/Admin
    participant FE as Frontend
    participant EvalSvc as Evaluation Service
    participant DB

    HR->>FE: Tạo Evaluation Cycle (chọn template_version, team/role áp dụng, start/end date)
    FE->>EvalSvc: POST /evaluation-cycles
    EvalSvc->>DB: insert evaluation_cycle (status=DRAFT)

    HR->>FE: Click "Open Cycle"
    FE->>EvalSvc: POST /evaluation-cycles/{id}/open
    loop mỗi employee applicable (theo team/role filter)
        EvalSvc->>DB: snapshot team_id/role_id/manager_id tại thời điểm này (✅ đã chốt: dùng team lúc mở cycle)
        EvalSvc->>DB: insert evaluation (status=OPEN)
        loop mỗi template_criterion applicable cho employee đó
            EvalSvc->>DB: insert evaluation_item (snapshot weight/rule_config/level_definition)
        end
    end
    EvalSvc->>DB: audit_log(action=CYCLE_OPENED, N evaluation đã sinh)
    EvalSvc-->>FE: cycle.status = OPEN
```

---

## 4. Employee Self-Assessment (bắt buộc)

> Tham chiếu: LLD mục 14 (✅ Self-assessment bắt buộc mọi cycle — không còn optional).

```mermaid
sequenceDiagram
    actor E as Employee
    participant FE as Frontend
    participant EvalSvc as Evaluation Service
    participant DB

    E->>FE: Mở "My Evaluation" (cycle vừa OPEN)
    FE->>EvalSvc: GET /evaluations/{id}
    EvalSvc-->>FE: danh sách evaluation_item cần tự đánh giá

    E->>FE: Nhập measurement/comment/evidence cho từng criterion
    FE->>EvalSvc: PUT /evaluations/{id}/items/{itemId}
    EvalSvc->>DB: update evaluation_item

    E->>FE: Click "Submit Self-Assessment"
    FE->>EvalSvc: POST /evaluations/{id}/self-submit
    EvalSvc->>DB: kiểm tra is_missing_score cho item required
    alt Còn thiếu score bắt buộc
        EvalSvc-->>FE: 400 MISSING_REQUIRED_SCORE
    else Đủ
        EvalSvc->>DB: evaluation.self_score lưu lại, status = MANAGER_ASSESSMENT
        EvalSvc->>DB: audit_log(action=SELF_SUBMIT)
        EvalSvc-->>FE: 200 OK — chuyển sang Manager Assessment
    end
```

---

## 5. Manager Assessment → Scoring Engine tính điểm

> Tham chiếu: LLD mục 12 (Rule Engine), mục 13 (Scoring Engine), mục 14 (Workflow).

```mermaid
sequenceDiagram
    actor M as Manager
    participant FE as Frontend
    participant EvalSvc as Evaluation Service
    participant RuleEngine
    participant ScoringEngine
    participant DB

    M->>FE: Mở evaluation của nhân viên trong team
    FE->>EvalSvc: GET /evaluations/{id}
    M->>FE: Nhập/duyệt measurement, comment, evidence từng criterion
    FE->>EvalSvc: PUT /evaluations/{id}/items/{itemId}
    EvalSvc->>DB: update evaluation_item

    M->>FE: Click "Submit"
    FE->>EvalSvc: POST /evaluations/{id}/submit
    EvalSvc->>DB: kiểm tra is_missing_score cho item required

    alt Còn thiếu
        EvalSvc-->>FE: 400 MISSING_REQUIRED_SCORE
    else Đủ
        loop mỗi evaluation_item
            EvalSvc->>RuleEngine: resolveLevel(measurement, rule_config_snapshot)
            RuleEngine-->>EvalSvc: resolved_level, raw_score hoặc requires_manual_review
        end

        EvalSvc->>ScoringEngine: calculateEvaluation(items) - weighted average, ROUND_HALF_UP
        ScoringEngine-->>EvalSvc: manager_score, overall_weighted_score

        EvalSvc->>DB: lưu raw_score, weighted_score, manager_score
        EvalSvc->>DB: evaluation.status = REVIEWING
        EvalSvc->>DB: audit_log action=SCORE_CALCULATED, MANAGER_SUBMIT
        EvalSvc-->>FE: 200 OK - chuyển sang Reviewing
    end
```

---

## 6. Review → Calibration (optional) → Approve → Auto-Publish

> Tham chiếu: LLD mục 14 (✅ Auto-publish — không còn thao tác "HR bấm Publish" riêng), mục 13 (Calibration).

```mermaid
sequenceDiagram
    actor R as Reviewer/HR
    participant FE as Frontend
    participant EvalSvc as Evaluation Service
    participant CalSvc as Calibration Service
    participant DB

    R->>FE: Xem evaluation ở trạng thái REVIEWING
    alt Cần chỉnh sửa
        R->>FE: Request correction
        FE->>EvalSvc: POST /evaluations/{id}/request-correction
        EvalSvc->>DB: status quay lại MANAGER_ASSESSMENT
        EvalSvc->>DB: audit_log(action=REQUEST_CORRECTION)
    else Đồng ý với kết quả
        opt Cycle có bật Calibration
            R->>FE: Mở Calibration session
            FE->>CalSvc: POST /calibration-sessions
            CalSvc->>DB: query distribution (avg/median/min/max theo team/cycle)
            R->>FE: Điều chỉnh final_score (nếu cần) — reason bắt buộc
            FE->>CalSvc: POST /calibration-sessions/{id}/adjustments
            CalSvc->>DB: audit_log(action=CALIBRATION_ADJUST, old/new score, reason)
            R->>FE: Finalize session
            FE->>CalSvc: POST /calibration-sessions/{id}/finalize
            CalSvc->>DB: evaluation.status = APPROVED
        end
        R->>FE: Click "Approve" (nếu không qua Calibration)
        FE->>EvalSvc: POST /evaluations/{id}/approve
        EvalSvc->>DB: evaluation.status = APPROVED
        Note over EvalSvc,DB: ✅ Đã chốt — Auto-publish: cùng transaction, không có bước thủ công riêng
        EvalSvc->>DB: evaluation.status = PUBLISHED
        EvalSvc->>DB: audit_log(action=APPROVE_AND_PUBLISH)
        EvalSvc-->>FE: 200 OK — Employee xem được kết quả ngay lập tức
    end
```

---

## 7. CSV Import hàng loạt

> Tham chiếu: LLD mục 15 (CSV Import Design) — format long/tidy, partial import mặc định.

```mermaid
sequenceDiagram
    actor HR as HR/Admin
    participant FE as Frontend
    participant ImportSvc as Import Service
    participant Validator
    participant Queue
    participant RuleEngine
    participant DB

    HR->>FE: Download CSV template (theo cycle đang chọn)
    HR->>FE: Upload file đã điền
    FE->>ImportSvc: POST /imports/csv (file, cycle_id)
    ImportSvc->>DB: tạo import_job (status=UPLOADED), check (cycle_id, file_hash) duplicate
    ImportSvc->>Validator: parse + validate từng dòng (employee/criterion/weight/duplicate...)
    Validator->>DB: ghi import_row (VALID/INVALID + error_messages)
    ImportSvc-->>FE: preview (total, valid, invalid, chi tiết lỗi theo row)

    HR->>FE: Xem lỗi, sửa & re-upload (nếu cần) hoặc Confirm phần hợp lệ
    FE->>ImportSvc: POST /imports/{id}/confirm { strict_mode }
    ImportSvc->>Queue: enqueue xử lý bất đồng bộ (file >500 rows)
    loop mỗi valid row
        Queue->>RuleEngine: resolveLevel(measurement, rule_snapshot)
        RuleEngine-->>Queue: resolved_level, raw_score
        Queue->>DB: tạo/cập nhật evaluation_item, tính weighted score
    end
    Queue->>DB: cập nhật import_row.status=IMPORTED, import_job summary
    Queue->>DB: audit_log(action=IMPORT, source=CSV_IMPORT)
    Queue-->>FE: (qua polling) import summary + import history
```

---

## 8. Xem Report (Employee / Manager / HR)

> Tham chiếu: LLD mục 19 (Reporting) — ✅ không có tính năng xếp hạng cá nhân dưới bất kỳ hình thức nào.

```mermaid
sequenceDiagram
    actor E as Employee
    actor M as Manager
    actor HR as HR/Admin
    participant FE as Frontend
    participant ReportSvc as Reporting Service
    participant DB as Read-model (materialized view)

    E->>FE: Mở "My Evaluation" (sau khi Published)
    FE->>ReportSvc: GET /reports/employees/{id}
    ReportSvc->>DB: query read-model theo employee_id
    ReportSvc-->>FE: overall score, breakdown theo category/criterion (chỉ của chính mình)

    M->>FE: Mở Team Report
    FE->>ReportSvc: GET /reports/teams/{teamId}
    ReportSvc->>DB: query aggregate (average, distribution/histogram)
    ReportSvc-->>FE: team average, completion rate — không có xếp hạng từng nhân viên

    HR->>FE: Mở Organization Report
    FE->>ReportSvc: GET /reports/organization
    ReportSvc->>DB: query aggregate toàn org/department/team
    ReportSvc-->>FE: distribution, so sánh team/department, trend theo cycle
    Note over ReportSvc,FE: Export dữ liệu cá nhân → audit_log(action=EXPORT)
```

---

## 9. Lock Cycle

> Tham chiếu: LLD mục 14 (Permission theo transition), mục 18 (Retention Policy — 2 năm trước khi archive).

```mermaid
sequenceDiagram
    actor HR as HR/Admin
    participant Scheduler as System (scheduled job)
    participant FE as Frontend
    participant EvalSvc as Evaluation Service
    participant DB

    alt HR chủ động lock
        HR->>FE: Click "Lock Cycle"
        FE->>EvalSvc: POST /evaluation-cycles/{id}/lock
    else Hết hạn tự động
        Scheduler->>EvalSvc: check end_date + grace period đã qua
    end

    EvalSvc->>DB: kiểm tra cycle.status != LOCKED

    alt Đã locked trước đó
        EvalSvc-->>FE: 409 CONFLICT - idempotent, không lock lại
    else Chưa locked
        EvalSvc->>DB: cycle.status = LOCKED
        EvalSvc->>DB: mọi evaluation.is_locked = true
        EvalSvc->>DB: audit_log action=LOCK
        EvalSvc-->>FE: 200 OK - mọi write từ giờ bị chặn
        Note over FE,EvalSvc: Write và adjust-score trả về 409 EVALUATION_LOCKED
    end
```

---

## 10. Audit Log — cross-cutting pattern

> Tham chiếu: LLD mục 18. Đây **không phải 1 flow độc lập** mà là pattern bắt buộc áp dụng cho **mọi write** ở Diagram 2–7, 9 (bất kỳ đâu ảnh hưởng weight/score/quyết định approve/adjust/override/import).

```mermaid
sequenceDiagram
    participant AnySvc as Bất kỳ Service nào<br/>(Template/Evaluation/Calibration/Import)
    participant DB

    AnySvc->>DB: BEGIN TRANSACTION
    AnySvc->>DB: business write (vd update score, publish, override, adjust...)
    AnySvc->>DB: INSERT audit_log (entity_type, entity_id, action,<br/>old_value, new_value, reason, performed_by, performed_at)
    AnySvc->>DB: COMMIT
    Note over AnySvc,DB: Nếu rollback ở bất kỳ bước nào, audit_log cũng rollback theo —<br/>không bao giờ có audit "mồ côi" hay business write thiếu audit.
    Note over DB: audit_log KHÔNG có API update/delete (chỉ INSERT/SELECT).<br/>Sau 2 năm (✅ đã chốt) → archive job chuyển sang cold storage, không xóa hẳn.
```

---

*Hết tài liệu. Mọi entity/API/business rule chi tiết tham chiếu `LLD_Employee_Performance_Evaluation_System_v1.2.md`.*
