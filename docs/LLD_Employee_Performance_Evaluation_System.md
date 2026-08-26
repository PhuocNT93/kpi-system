# LLD — Employee Performance Evaluation Management System

> **Trạng thái tài liệu:** v1.2 — đã cập nhật theo quyết định chính thức từ HR/Manager (xem changelog cuối tài liệu) và bổ sung Google Workspace SSO.
> **18 tiêu chí hiện tại (Performance / Capability / Contribution) chỉ được coi là *seed data / sample configuration*.** Toàn bộ hệ thống được thiết kế theo hướng **Configurable, Rule-driven Evaluation Framework** — không hard-code criterion, weight, level, hay tool phụ thuộc vào application code.

---

## 1. Executive Summary

Hệ thống quản lý đánh giá hiệu suất/năng lực nhân viên, cho phép HR/Admin **tự cấu hình** toàn bộ khung đánh giá (criteria, weight, level, scoring rule, evidence, applicability) **mà không cần developer can thiệp code hay deploy lại backend**. Hệ thống hỗ trợ nhiều evaluation cycle, nhiều team/role với rule khác nhau, nhập liệu thủ công hoặc CSV import hàng loạt, workflow phê duyệt nhiều bước, calibration, và bảo toàn dữ liệu lịch sử tuyệt đối (immutability) khi cycle đã bị khóa (locked).

Kiến trúc đề xuất: **Modular Monolith**, tách rõ các bounded context (Employee, Template/Criteria, Evaluation, Rule Engine, Import, Audit, Reporting) để dễ maintain và có đường tách thành microservices sau này nếu cần scale.

---

## 2. Goals / Non-goals

### Goals
- Configurable evaluation framework: thêm/sửa/xóa/disable criterion, weight, level, rule mà không cần code.
- Hỗ trợ đa team, đa role với rule khác nhau trên cùng criterion (role-specific, team-specific override).
- Generic measurement model — không tạo cột riêng cho từng criterion.
- CSV import có validate/preview/partial-import với báo lỗi rõ theo từng dòng.
- Workflow đánh giá nhiều bước, configurable ở mức hợp lý (không full workflow engine).
- Snapshot hóa criterion/template vào evaluation đã submit để đảm bảo lịch sử không đổi khi template gốc thay đổi.
- Audit log đầy đủ, immutable cho mọi thay đổi có ảnh hưởng đến điểm số.
- RBAC rõ ràng theo 4 nhóm role: Employee, Team Lead/Manager, HR/Admin, System Admin.

### Non-goals (giai đoạn MVP)
- Không xây dựng full BPMN workflow engine (dùng state machine cấu hình đơn giản).
- Không tích hợp tự động với Jira/Git/QA tool ở MVP (evidence là URL/text/manual).
- Không làm multi-tenant (multi-organization) ở MVP — giả định 1 organization.
- Không làm real-time collaborative editing.
- Không làm ranking/stack-ranking tự động (chỉ hỗ trợ xem distribution aggregate theo team/org — **không** xem xếp hạng cá nhân dưới bất kỳ hình thức nào, kể cả ẩn danh; ✅ đã chốt, xem mục 19).

### Scope
In-scope: employee management, evaluation cycle/template/criteria configuration, manual entry, CSV import, scoring engine, workflow, calibration (cơ bản), reporting, audit, RBAC.
Out-of-scope: payroll, compensation review, recruitment, LMS.

---

## 3. Requirements Summary

Xem chi tiết ở mục 24 (Feature Breakdown). Yêu cầu cốt lõi nhất — được nhấn 3 lần trong prompt gốc — là: **evaluation criteria không cố định**, phải configure được ở cấp Global → Team → Role → Template, có precedence rõ ràng, và **evaluation lịch sử immutable** sau khi lock.

---

## 4. Business Domain

18 KPI mẫu (đính kèm trong file CSV gốc) minh họa 3 category: **Performance, Capability, Contribution**, mỗi criterion có 5 level, weight khác nhau theo role (SI/SM), một số phụ thuộc tool (Jira, Git/PR, QA report, CR log) nhưng **tool đó chỉ là "evidence source label"** — một enum mở, không phải integration bắt buộc.

Insight quan trọng rút ra từ dữ liệu mẫu để đưa vào rule engine:
| Kiểu criterion | Ví dụ | Kiểu rule |
|---|---|---|
| Threshold theo % (range) | On-time Completion | Range/threshold table |
| Threshold theo số đếm nghịch (càng thấp càng tốt) | Production Incident, Bug & Rework | Inverse threshold table |
| Ordinal / mô tả định tính theo level | Independence, Ownership Scope, Attitude | Level-description mapping (điểm nhập tay theo mô tả) |
| Số lượng tích lũy | Knowledge Sharing, Mentoring, Proposing Improvements | Count threshold table |
| Composite theo role (SI khác SM) | Testing & Documentation | Role-conditional rule |

→ Đây chính là lý do rule engine phải hỗ trợ **nhiều "rule type"** dùng chung 1 data model, không phải if/else theo tên criterion.

---

## 5. Feature Breakdown (MVP vs Phase 2)

### MVP
- Employee / Team / Role / Department management (CRUD, import cơ bản)
- Evaluation Cycle management
- Evaluation Template Builder (configurable, low-code UI)
- Criterion Management với Global/Team/Role override + precedence
- Level & Scoring rule configuration (threshold table, count table, ordinal mapping)
- Manual evaluation entry (Draft → Submit → Review → Approve)
- CSV Import (template versioned, validate, preview, partial import, import history)
- Scoring Engine (raw score → weighted score → overall score)
- Basic evaluation workflow (configurable steps, tối thiểu: Self-assessment **bắt buộc** → Manager Assessment → Approval → Publish **tự động** → Lock — ✅ đã chốt, xem mục 14)
- Immutable historical evaluation (snapshot)
- Audit log (mọi thay đổi weight/score/level)
- RBAC (4 role nhóm)
- Basic dashboard: employee score, team average, completion rate

### Phase 2 (lý do loại khỏi MVP: giá trị cao nhưng phụ thuộc tích hợp ngoài / độ phức tạp cao / cần dữ liệu MVP chạy ổn định trước)
- Calibration nâng cao (auto-suggest adjustment, bell-curve normalization)
- Peer review
- Advanced reporting/BI, trend analysis nhiều cycle
- Score normalization giữa các team
- Notification/Email integration
- Jira/Git integration (tự động lấy measurement)
- Goal tracking, performance trend, promotion recommendation

**Lý do không làm ở MVP:** các integration (Jira/Git) đòi hỏi mapping riêng cho từng team/tool — vi phạm nguyên tắc "tool không hard-code"; nên để MVP ổn định với manual + CSV trước, sau đó xây **Evidence Provider Plugin interface** ở Phase 2.

---

## 6. User Roles & Employee Model

### Employee entity (tối thiểu)
`employee_code (business code), full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status (enum: ACTIVE/INACTIVE/ON_LEAVE/TERMINATED), join_date`

`role` và `job_level` **không hard-code enum cứng** trong code — thiết kế thành bảng reference (`role`, `job_level`) để mở rộng (SI, SM, BA, QA, DevOps... ; Junior/Middle/Senior/Lead/Principal...).

### RBAC — 4 nhóm
1. **Employee** — xem evaluation của mình, nhập self-assessment (**bắt buộc mọi cycle** — ✅ đã chốt), submit self-assessment, xem lịch sử.
2. **Team Lead / Manager** — đánh giá nhân viên trong team quản lý, review evidence, submit/reject, request correction.
3. **HR / Admin** — quản lý employee/team/cycle/template/criteria, import CSV, xem report toàn org, thực hiện calibration.
4. **System Admin** — user/permission management, cấu hình hệ thống, xem audit log toàn bộ (read-only với business data).

Permission matrix chi tiết ở mục 17.

---

## 7. System Architecture

### Lựa chọn: Modular Monolith

| Option | Đánh giá |
|---|---|
| A. Monolith (không module hóa) | Nhanh ban đầu nhưng rule engine + workflow + reporting sẽ nhanh chóng đan xen, khó maintain khi criteria thay đổi liên tục |
| **B. Modular Monolith (chọn)** | Ranh giới module rõ theo bounded context, deploy đơn giản, transaction dễ (1 DB), team nhỏ dễ vận hành, vẫn tách được thành service sau này theo module boundary có sẵn |
| C. Microservices | Over-engineering ở quy mô hiện tại (chưa multi-org, chưa cần scale độc lập từng phần), tăng chi phí vận hành (distributed transaction cho scoring + audit) |

**Quyết định:** Modular Monolith. **Lý do:** ưu tiên dễ maintain, configurable, auditable, tránh over-engineering theo đúng yêu cầu đề bài. **Trade-off:** khi tổ chức scale rất lớn (multi-org, triệu record), cần tách Reporting/Import ra service riêng — thiết kế module boundary ngay từ đầu để việc này không phải viết lại.

### Module boundaries
```
1. IAM & RBAC Module          — user, role, permission, session
2. Organization Module        — department, team, employee, job_level
3. Template & Criteria Module — evaluation_template, criterion, criterion_version, rule config
4. Evaluation Module          — evaluation_cycle, evaluation, evaluation_item, score, evidence
5. Rule Engine Module         — pure calculation engine (stateless), input = measurement + rule config
6. Import Module              — csv_template, import_job, import_row
7. Workflow Module            — state machine config, transition, approval
8. Calibration Module         — comparison, adjustment, adjustment_reason
9. Audit Module                — audit_log (write-once)
10. Reporting Module          — read-model / materialized views
```

### Mermaid — System Architecture
```mermaid
flowchart TB
    subgraph Client
        WebApp[Web App - Admin/Manager/Employee]
    end

    subgraph API["API Gateway / BFF"]
        GW[REST API Layer]
    end

    subgraph Core["Modular Monolith"]
        IAM[IAM & RBAC]
        ORG[Organization]
        TPL[Template & Criteria]
        EVAL[Evaluation]
        RULE[Rule Engine - stateless]
        IMPORT[CSV Import]
        WF[Workflow]
        CAL[Calibration]
        AUDIT[Audit Log]
        REPORT[Reporting]
    end

    DB[(Primary DB - PostgreSQL)]
    FILE[(File Storage - CSV / Evidence)]
    CACHE[(Cache - Redis)]
    QUEUE[(Job Queue - async import/report)]

    WebApp --> GW
    GW --> IAM
    GW --> ORG
    GW --> TPL
    GW --> EVAL
    GW --> IMPORT
    GW --> CAL
    GW --> REPORT

    EVAL --> RULE
    IMPORT --> RULE
    EVAL --> WF
    EVAL --> AUDIT
    TPL --> AUDIT
    CAL --> AUDIT
    IMPORT --> QUEUE
    REPORT --> CACHE

    IAM --> DB
    ORG --> DB
    TPL --> DB
    EVAL --> DB
    IMPORT --> DB
    IMPORT --> FILE
    AUDIT --> DB
    REPORT --> DB
```

---

## 8. Module Architecture (chi tiết trách nhiệm)

| Module | Trách nhiệm chính | Không làm |
|---|---|---|
| Template & Criteria | CRUD criterion, version, override theo team/role, precedence resolution | Không tính score |
| Rule Engine | Nhận measurement + rule config → trả level + raw score | Không biết criterion là gì (stateless, generic) |
| Evaluation | Quản lý vòng đời evaluation/evaluation_item, gọi Rule Engine, snapshot | Không tự định nghĩa rule |
| Import | Parse, validate, preview, ghi import_row, gọi Evaluation để tạo/cập nhật evaluation_item | Không tự ý thay đổi template |
| Workflow | Quản lý state transition + permission theo state | Không tính điểm |
| Calibration | So sánh, ghi adjustment, không tự động sửa score gốc mà tạo `final_score` riêng | — |
| Audit | Ghi log bất biến cho mọi thay đổi có ý nghĩa nghiệp vụ | Không cho update/delete |

---

## 9. Domain Model (ERD)

```mermaid
erDiagram
    ORGANIZATION ||--o{ DEPARTMENT : has
    DEPARTMENT ||--o{ TEAM : has
    TEAM ||--o{ EMPLOYEE : contains
    ROLE ||--o{ EMPLOYEE : "assigned to"
    JOB_LEVEL ||--o{ EMPLOYEE : "assigned to"
    EMPLOYEE ||--o{ EMPLOYEE : "manages (manager_id)"
    EMPLOYEE ||--o| USER_ACCOUNT : "login qua Google (mục 10.8)"

    EVALUATION_CYCLE ||--o{ EVALUATION_TEMPLATE_VERSION : uses
    EVALUATION_TEMPLATE ||--o{ EVALUATION_TEMPLATE_VERSION : "versioned by"
    EVALUATION_TEMPLATE_VERSION ||--o{ TEMPLATE_CRITERION : includes

    CRITERION ||--o{ CRITERION_VERSION : "versioned by"
    CRITERION_VERSION ||--o{ TEMPLATE_CRITERION : "referenced in"
    CRITERION_VERSION ||--o{ CRITERION_OVERRIDE : "overridden by"
    CRITERION_VERSION ||--o{ CRITERION_LEVEL : defines
    CRITERION_VERSION ||--|| SCORING_RULE : uses

    EVALUATION_CYCLE ||--o{ EVALUATION : has
    EMPLOYEE ||--o{ EVALUATION : "evaluated in"
    EVALUATION ||--o{ EVALUATION_ITEM : contains
    TEMPLATE_CRITERION ||--o{ EVALUATION_ITEM : "snapshot of"
    EVALUATION_ITEM ||--o| MEASUREMENT : has
    EVALUATION_ITEM ||--o{ EVIDENCE : has
    EVALUATION_ITEM ||--o{ SCORE_ADJUSTMENT : "may have"

    EVALUATION ||--o{ APPROVAL : "goes through"
    EVALUATION ||--o{ REVIEW : "reviewed by"
    EVALUATION_CYCLE ||--o{ CALIBRATION_SESSION : has
    CALIBRATION_SESSION ||--o{ CALIBRATION_ADJUSTMENT : produces

    CSV_TEMPLATE ||--o{ CSV_TEMPLATE_COLUMN : defines
    CSV_TEMPLATE ||--o{ IMPORT_JOB : "used by"
    IMPORT_JOB ||--o{ IMPORT_ROW : contains
    IMPORT_ROW }o--o| EVALUATION_ITEM : "creates/updates"

    AUDIT_LOG }o--|| EMPLOYEE : "performed by"
```

**Giải thích cardinality quan trọng:**
- `EVALUATION_TEMPLATE_VERSION` 1—N `TEMPLATE_CRITERION`: mỗi lần publish template version mới sẽ snapshot danh sách criterion + weight tại thời điểm đó.
- `EVALUATION_ITEM` **không** trỏ trực tiếp tới `CRITERION` mà trỏ tới `TEMPLATE_CRITERION` (đã snapshot weight/level/rule) → đảm bảo immutability khi criterion gốc đổi sau này (xem mục 16, 21.8).
- `CRITERION_OVERRIDE` cho phép Team/Role override weight/level của 1 `CRITERION_VERSION` mà không tạo bản criterion mới hoàn toàn — giải quyết bài toán precedence (mục 17).

---

## 10. Database Design

> Quy ước đặt tên: `snake_case`, PK = `<table_name>_id UUID` (ví dụ: `employee_id`, `evaluation_id`), business key riêng (`code`), mọi bảng có `created_at, updated_at, created_by, updated_by`; bảng finalized có thêm `is_locked BOOLEAN`.

### 10.1 Organization

**department**
| Column | Type | Null | Default | Key | Note |
|---|---|---|---|---|---|
| department_id | uuid | N | gen_random_uuid() | PK | |
| code | varchar(50) | N | | UNIQUE | |
| name | varchar(200) | N | | | |
| active | boolean | N | true | | |

**team**
| team_id uuid PK | code varchar UNIQUE | name varchar | department_id FK→department | active boolean |

**role** *(SI, SM, BA... — mở rộng được)*
| role_id uuid PK | code varchar UNIQUE | name varchar | description text | active boolean |

**job_level**
| job_level_id uuid PK | code varchar UNIQUE (JUNIOR, MIDDLE...) | name varchar | rank int (thứ tự sắp xếp) | active boolean |

**employee**
| Column | Type | Null | Note |
|---|---|---|---|
| employee_id | uuid | N | PK |
| employee_code | varchar(50) | N | UNIQUE |
| full_name | varchar(200) | N | |
| email | varchar(200) | N | UNIQUE |
| department_id | uuid | Y | FK |
| team_id | uuid | Y | FK |
| role_id | uuid | N | FK |
| job_level_id | uuid | N | FK |
| manager_id | uuid | Y | FK → employee.employee_id (self) |
| employment_status | varchar(20) | N | ENUM ACTIVE/INACTIVE/ON_LEAVE/TERMINATED |
| join_date | date | N | |

Index: `(team_id)`, `(manager_id)`, `(employment_status)`.

**employee_team_history** *(giải quyết Q5 mục 23 — chuyển team giữa cycle)*
| employee_team_history_id uuid PK | employee_id FK | team_id FK | role_id FK | effective_from date | effective_to date null |

> Khi tạo evaluation, hệ thống chốt team/role của employee **tại thời điểm cycle bắt đầu** (snapshot vào `evaluation.team_id_snapshot`, `evaluation.role_id_snapshot`) — không dùng `employee.team_id` hiện tại để tránh sai lệch nếu employee đổi team sau đó.

### 10.2 Template & Criteria

**criterion** *(định danh logic, không version-specific)*
| criterion_id uuid PK | code varchar(50) UNIQUE | category varchar(30) — ENUM PERFORMANCE/CAPABILITY/CONTRIBUTION (mở rộng qua bảng `criterion_category` nếu cần) | name varchar | description text | active boolean |

**criterion_version** *(mỗi lần sửa weight/level/rule → version mới, immutable)*
| Column | Type | Note |
|---|---|---|
| criterion_version_id | uuid PK | |
| criterion_id | uuid FK | |
| version_no | int | tăng dần theo criterion |
| default_weight | numeric(5,2) | % mặc định (global) |
| measurement_unit | varchar(30) | %, count, incident, mentees, score... (generic, không enum cứng) |
| measurement_source_label | varchar(100) | free-text label: "Jira", "Git/PR", "QA report"... KHÔNG phải FK tới hệ thống tích hợp thật |
| scoring_rule_id | uuid FK → scoring_rule | |
| effective_from | timestamptz | |
| effective_to | timestamptz | null nếu đang hiệu lực |
| status | varchar(20) | DRAFT / PUBLISHED / DEPRECATED |

Unique: `(criterion_id, version_no)`.

**criterion_level** *(mô tả 5 level, gắn với criterion_version)*
| criterion_level_id uuid PK | criterion_version_id FK | level_no int (1-5) | label_en varchar | label_vn varchar | score_value numeric(5,2) — điểm số ứng với level (mặc định 1..5, nhưng configurable) |

**scoring_rule** *(generic rule container — xem mục 18 chi tiết)*
| scoring_rule_id uuid PK | rule_type varchar(30) — ENUM: RANGE_THRESHOLD / INVERSE_THRESHOLD / COUNT_THRESHOLD / ORDINAL_MANUAL / ROLE_CONDITIONAL | rule_config jsonb | description text |

**criterion_override** *(Team-specific / Role-specific / Template-specific override)*
| Column | Type | Note |
|---|---|---|
| criterion_override_id | uuid PK | |
| criterion_version_id | uuid FK | criterion gốc bị override |
| scope_type | varchar(20) | ENUM: TEAM / ROLE / TEMPLATE |
| scope_id | uuid | team_id hoặc role_id hoặc template_version_id tùy scope_type |
| override_weight | numeric(5,2) | nullable — null nghĩa là không override weight |
| override_scoring_rule_id | uuid FK | nullable |
| active | boolean | |

**evaluation_template**
| evaluation_template_id uuid PK | code varchar UNIQUE | name varchar | description text | active boolean |

**evaluation_template_version** *(publish-immutable snapshot)*
| evaluation_template_version_id uuid PK | evaluation_template_id FK | version_no int | status ENUM DRAFT/PUBLISHED/ARCHIVED | published_at timestamptz | published_by uuid |

Unique: `(evaluation_template_id, version_no)`.

**template_criterion** *(danh sách criterion trong 1 template version — đây là bản "chốt" cuối cùng dùng để tạo evaluation_item)*
| template_criterion_id uuid PK | evaluation_template_version_id FK | criterion_version_id FK | effective_weight numeric(5,2) — weight đã resolve sau precedence tại thời điểm publish | applicable_role_ids uuid[] | applicable_team_ids uuid[] | is_disabled boolean | display_order int |

> `effective_weight` được **tính và chốt (denormalize) tại thời điểm publish template**, dựa trên precedence resolver (mục 17), để tránh phải resolve lại mỗi lần tính score và đảm bảo tính bất biến.

### 10.3 Evaluation Cycle & Evaluation

**evaluation_cycle**
| evaluation_cycle_id uuid PK | code varchar UNIQUE | name varchar | start_date date | end_date date | status varchar(20) — DRAFT/OPEN/IN_PROGRESS/SUBMITTED/REVIEWING/CALIBRATION/APPROVED/PUBLISHED/LOCKED | evaluation_template_version_id FK | applicable_team_ids uuid[] | applicable_role_ids uuid[] | created_by uuid | approved_by uuid | locked_at timestamptz null |

**evaluation** *(1 employee × 1 cycle)*
| Column | Type | Note |
|---|---|---|
| evaluation_id | uuid PK | |
| evaluation_cycle_id | uuid FK | |
| employee_id | uuid FK | |
| team_id_snapshot | uuid | chốt tại thời điểm tạo |
| role_id_snapshot | uuid | chốt tại thời điểm tạo |
| job_level_snapshot | uuid | |
| manager_id_snapshot | uuid | |
| status | varchar(20) | theo state machine mục 21.7 |
| self_score | numeric(6,3) null | |
| manager_score | numeric(6,3) null | |
| final_score | numeric(6,3) null | sau calibration/override |
| submitted_at | timestamptz null | |
| approved_at | timestamptz null | |
| is_locked | boolean | default false |

Unique: `(evaluation_cycle_id, employee_id)`.

**evaluation_item** *(1 dòng / 1 criterion, snapshot toàn bộ config cần thiết để tính điểm)*
| Column | Type | Note |
|---|---|---|
| evaluation_item_id | uuid PK | |
| evaluation_id | uuid FK | |
| template_criterion_id | uuid FK | |
| criterion_code_snapshot | varchar | denormalize để hiển thị nhanh & phòng khi criterion bị xóa |
| criterion_name_snapshot | varchar | |
| weight_snapshot | numeric(5,2) | copy từ `template_criterion.effective_weight` tại thời điểm evaluation được tạo |
| scoring_rule_snapshot | jsonb | copy toàn bộ rule_config tại thời điểm tạo |
| level_definition_snapshot | jsonb | copy toàn bộ criterion_level |
| resolved_level | int null | kết quả Rule Engine |
| raw_score | numeric(6,3) null | score_value theo level |
| weighted_score | numeric(6,3) null | raw/max * weight |
| is_disabled_for_employee | boolean | nếu criterion không applicable |
| is_missing_score | boolean | |
| comment | text null | |
| reviewer_id | uuid null | |
| review_date | timestamptz null | |

**measurement** *(generic — 1-1 với evaluation_item, hoặc 1-N nếu criterion cần nhiều measurement point — thiết kế 1-N để mở rộng)*
| measurement_id uuid PK | evaluation_item_id FK | measurement_key varchar(50) — vd "primary" | measurement_value numeric(12,4) | measurement_unit varchar(30) | source_label varchar(100) | recorded_at timestamptz | recorded_by uuid |

**evidence**
| evidence_id uuid PK | evaluation_item_id FK | evidence_type varchar(20) — ENUM URL/TEXT/FILE | evidence_value text | uploaded_by uuid | uploaded_at timestamptz |

**score_adjustment** *(manual override có audit)*
| score_adjustment_id uuid PK | evaluation_item_id FK | old_score numeric | new_score numeric | reason text NOT NULL | adjusted_by uuid | adjusted_at timestamptz |

### 10.4 Workflow / Review / Approval

**review**
| review_id uuid PK | evaluation_id FK | reviewer_id FK | review_type varchar(20) — SELF/MANAGER/PEER | status varchar(20) — PENDING/DONE/REJECTED | comment text | reviewed_at timestamptz |

**approval**
| approval_id uuid PK | evaluation_id FK | approver_id FK | decision varchar(20) — APPROVED/REJECTED | comment text | decided_at timestamptz |

**workflow_definition** *(configurable state machine — xem 21.7)*
| workflow_definition_id uuid PK | code varchar UNIQUE | applicable_evaluation_template_id FK null | steps jsonb — mảng {state, allowed_roles[], next_states[]} |

### 10.5 Calibration

**calibration_session**
| calibration_session_id uuid PK | evaluation_cycle_id FK | scope_type ENUM TEAM/DEPARTMENT/ORG | scope_id uuid null | status varchar | created_by uuid |

**calibration_adjustment**
| calibration_adjustment_id uuid PK | calibration_session_id FK | evaluation_id FK | old_final_score numeric | new_final_score numeric | reason text NOT NULL | adjusted_by uuid | adjusted_at timestamptz |

### 10.6 CSV Import

**csv_template**
| csv_template_id uuid PK | code varchar UNIQUE | version_no int | status ENUM DRAFT/ACTIVE/DEPRECATED | effective_from timestamptz |

**csv_template_column**
| csv_template_column_id uuid PK | csv_template_id FK | column_name varchar | data_type varchar(20) | required boolean | validation_rule jsonb | display_order int |

**import_job**
| import_job_id uuid PK | csv_template_id FK | evaluation_cycle_id FK | file_name varchar | file_hash varchar(64) — chống import trùng | status varchar(20) — UPLOADED/VALIDATING/PREVIEW/IMPORTING/COMPLETED/FAILED/PARTIALLY_COMPLETED | total_rows int | success_rows int | error_rows int | imported_by uuid | started_at timestamptz | finished_at timestamptz |

Unique: `(evaluation_cycle_id, file_hash)` → chống import lại đúng file (giải quyết Q15).

**import_row**
| import_row_id uuid PK | import_job_id FK | row_no int | raw_data jsonb | status varchar(20) — VALID/INVALID/IMPORTED/SKIPPED | error_messages jsonb null | evaluation_item_id uuid null FK |

### 10.7 Audit

**audit_log** *(write-once, không update/delete — enforced bằng DB trigger/permission, không qua application logic)*
| audit_log_id uuid PK | entity_type varchar(50) | entity_id uuid | action varchar(20) — CREATE/UPDATE/DELETE/APPROVE/REJECT/ADJUST | field_name varchar(100) null | old_value text null | new_value text null | reason text null | performed_by uuid FK employee | performed_at timestamptz | source varchar(20) — UI/CSV_IMPORT/API |

Index: `(entity_type, entity_id)`, `(performed_at)`.

### 10.8 IAM / Authentication (mới — Google Workspace SSO)

> Bổ sung schema còn thiếu ở bản draft trước: mục 7 đã liệt kê "IAM & RBAC Module" nhưng chưa có bảng cụ thể. Thêm ở đây để nhất quán với tính năng Google login (mục 21).

**user_account** *(tách biệt với `employee` — 1 employee có thể chưa từng login lần nào, nên chưa có `user_account`)*
| Column | Type | Null | Note |
|---|---|---|---|
| user_account_id | uuid | N | PK |
| employee_id | uuid | N | FK → employee, UNIQUE (1-1) |
| google_sub | varchar(255) | N | UNIQUE — Google's stable subject ID (không dùng email làm định danh chính vì email có thể đổi) |
| email_at_login | varchar(200) | N | email lấy từ Google ID token tại lần login gần nhất (đối chiếu với `employee.email`) |
| access_role | varchar(20) | N | ENUM: `EMPLOYEE` / `MANAGER` / `HR_ADMIN` / `SYSTEM_ADMIN` — nhóm quyền RBAC (mục 17), **khác** với `employee.role_id` (job title SI/SM/BA) |
| status | varchar(20) | N | ENUM `ACTIVE` / `DISABLED` |
| last_login_at | timestamptz | Y | |

Unique: `(employee_id)`, `(google_sub)`.

> **`access_role` mặc định = `EMPLOYEE`** khi tự động tạo account ở lần login đầu. `MANAGER` được **suy ra tự động** (nếu `employee_id` xuất hiện trong cột `manager_id` của bảng `employee` khác) — không cần gán tay. `HR_ADMIN`/`SYSTEM_ADMIN` **không bao giờ tự động gán** — chỉ System Admin hiện tại mới gán được qua IAM Admin UI, kể cả khi user đó login bằng email công ty hợp lệ (tránh privilege escalation qua Google login).

---

## 11. Configurable Criteria Model — Precedence

### Thứ tự ưu tiên khi resolve weight/rule (từ thấp → cao, cái sau override cái trước)
```
1. CRITERION_VERSION.default_weight / default rule      (Global)
2. CRITERION_OVERRIDE where scope_type = ROLE            (Role-specific)
3. CRITERION_OVERRIDE where scope_type = TEAM             (Team-specific)
4. CRITERION_OVERRIDE where scope_type = TEMPLATE          (Template-specific — cao nhất)
```

**Ví dụ theo đúng prompt:**
```
Global: On-time Completion = 10%
Role SI override: 12%
Team A override: 15%
Template 2026 override: 20%
→ Kết quả resolve = 20% (Template thắng, vì cụ thể nhất & là quyết định cuối cùng của người tạo cycle)
```

**Lý do chọn Template làm cấp cao nhất:** Template là artifact người dùng cuối (HR/Admin tạo cycle) trực tiếp thấy và chỉnh trên UI Template Builder — đúng nguyên tắc "WYSIWYG": cái Admin nhìn thấy trên màn hình phải là cái được áp dụng, không có override ẩn nào cao hơn.

**Rule resolve chạy 1 lần duy nhất tại thời điểm publish template version**, kết quả ghi vào `template_criterion.effective_weight` (denormalized) — không resolve runtime mỗi lần tính score, để:
- Đảm bảo hiệu năng khi tính score hàng loạt (CSV import 1000+ rows).
- Đảm bảo evaluation đã tạo không bị ảnh hưởng nếu override thay đổi sau đó (vì evaluation_item đã snapshot).

### Xử lý weight không đủ/vượt 100%
- Khi publish template version, hệ thống **validate tổng effective_weight của các criterion không bị disabled**:
  - Nếu tổng ≠ 100%: **chặn publish**, hiển thị cảnh báo chính xác (vd "Tổng weight = 96%, thiếu 4%").
  - Cho phép Admin **normalize tự động** (tùy chọn nút "Auto-normalize" chia lại tỷ lệ theo tổng hiện có) hoặc tự sửa tay.
- **Quyết định:** Strict validation (chặn publish nếu ≠ 100%), không cho phép tổng ≠ 100% đi vào production, vì sai lệch tổng sẽ làm overall score toàn bộ cycle sai lệch một cách âm thầm — hậu quả lớn hơn nhiều so với cost validate thêm 1 bước.
- **Alternative đã cân nhắc:** Cho phép ≠ 100% và scale tự động khi tính overall score (`overall = Σ weighted / Σ weight_of_active_criteria`). **Trade-off:** linh hoạt hơn nhưng dễ gây hiểu lầm khi so sánh điểm giữa 2 employee có set criterion khác nhau active/disabled khác nhau. → Chọn Strict để đơn giản & minh bạch, nhưng vẫn implement công thức scale này cho **case criterion bị disable riêng cho 1 employee cụ thể** (xem bên dưới).

### Criterion bị disable / không applicable cho 1 employee cụ thể
- Khi 1 `template_criterion` có `applicable_role_ids`/`applicable_team_ids` không khớp employee → `evaluation_item.is_disabled_for_employee = true`, **không tính vào tổng weight của evaluation đó**.
- Overall score employee đó = `Σ(weighted_score của criterion active) / Σ(weight_snapshot của criterion active) × 100`. Đây chính là công thức "scale lại" nói trên, áp dụng ở **mức 1 evaluation**, không phải mức template.

### Missing score / Missing evidence
- `evaluation_item.is_missing_score = true` nếu chưa nhập score khi đến hạn submit.
- Business rule: **không cho Manager submit evaluation nếu còn item required chưa có score** (trừ khi criterion được đánh dấu optional ở template — field `template_criterion.is_optional`).
- Missing evidence: cấu hình `scoring_rule.require_evidence boolean` — nếu true mà không có evidence, hệ thống cảnh báo nhưng **không chặn submit** (đánh dấu `evaluation_item.evidence_incomplete = true` để Reviewer chú ý) — vì evidence có thể phát sinh ngoài hệ thống (vd verbal feedback).

### Manual override / adjustment / rounding
- **Quyền override (✅ đã chốt):** Manager (team mình) và HR/Admin — **System Admin không có quyền này** (giữ đúng nguyên tắc read-only với business data, mục 6). Mọi thay đổi score sau khi Rule Engine đã tính (kể cả bởi Manager) đi qua `score_adjustment` với `reason` bắt buộc, ghi `audit_log` tự động (trigger ở Evaluation module, không phải tự nguyện từ UI).
- Rounding: chuẩn hóa **2 chữ số thập phân**, làm tròn theo `ROUND_HALF_UP`, áp dụng nhất quán ở tầng Rule Engine (không làm tròn ở DB, không làm tròn ở UI riêng lẻ) để tránh sai lệch cộng dồn.

---

## 12. Rule Engine

### Lựa chọn thiết kế: **Hybrid — Decision Table (JSON) + Strategy Pattern**, không dùng full Expression Engine (vd Drools) ở MVP.

| Option | Đánh giá |
|---|---|
| JSON rule thuần (chỉ range table) | Đơn giản nhưng không đủ cho case ORDINAL_MANUAL (Independence, Attitude — không có công thức, cần người chấm mô tả) |
| Expression Engine (MVEL/Drools/JS sandbox) | Quá mạnh so với nhu cầu, rủi ro bảo mật khi cho phép chạy expression tùy ý do người dùng nhập, tăng chi phí vận hành |
| **Decision Table (JSON) + Strategy Pattern (chọn)** | Mỗi `rule_type` là 1 strategy cố định (code), nhưng **data-driven qua `rule_config jsonb`** — đáp ứng đúng yêu cầu "criterion mới không cần deploy code" vì thêm criterion mới chỉ cần chọn `rule_type` có sẵn + nhập config JSON qua UI, không cần thêm rule_type mới cho hầu hết trường hợp thực tế |
| Rule table quan hệ (mỗi row 1 điều kiện) | Tương đương JSON nhưng khó thể hiện range/composite gọn — JSON linh hoạt hơn với cùng mức an toàn |

**Quyết định cuối:** Hybrid. 5 strategy cố định trong code (đủ bao phủ 18 KPI mẫu + phần lớn nhu cầu tương lai), config hoàn toàn qua `rule_config jsonb`:

```
RuleType.RANGE_THRESHOLD     → cho % / số liên tục, ví dụ On-time Completion
RuleType.INVERSE_THRESHOLD   → càng thấp càng tốt, ví dụ Bug, Production Incident
RuleType.COUNT_THRESHOLD     → đếm sự kiện, ví dụ Knowledge Sharing, Mentoring
RuleType.ORDINAL_MANUAL      → không tính tự động, Reviewer chọn trực tiếp level 1-5 theo mô tả
RuleType.ROLE_CONDITIONAL    → wrapper: chọn 1 trong các rule trên tùy theo role của employee (ví dụ Testing & Documentation: SI dùng RANGE_THRESHOLD theo % unit test coverage, SM dùng ORDINAL_MANUAL)
```

### Ví dụ `rule_config` cho từng type

**RANGE_THRESHOLD** (On-time Completion):
```json
{
  "type": "RANGE_THRESHOLD",
  "ranges": [
    { "min": 0,  "max": 69.99,  "level": 1 },
    { "min": 70, "max": 89.99,  "level": 2 },
    { "min": 90, "max": 99.99,  "level": 3 },
    { "min": 100, "max": 100,   "level": 4 }
  ],
  "level_5_requires_manual": true
}
```

**INVERSE_THRESHOLD** (Production Incident):
```json
{
  "type": "INVERSE_THRESHOLD",
  "ranges": [
    { "min": 0, "max": 0, "level": 5 },
    { "min": 1, "max": 1, "level": 3 },
    { "min": 2, "max": 2, "level": 2 },
    { "min": 3, "max": null, "level": 1 }
  ]
}
```

**COUNT_THRESHOLD** (Knowledge Sharing):
```json
{
  "type": "COUNT_THRESHOLD",
  "thresholds": [1, 2, 3, 4],
  "level_5_note": "Org-wide — requires manual confirmation"
}
```

**ORDINAL_MANUAL** (Independence):
```json
{
  "type": "ORDINAL_MANUAL",
  "require_reviewer_selection": true,
  "level_labels": {
    "1": "Cần hỗ trợ thường xuyên",
    "2": "Thỉnh thoảng",
    "3": "Độc lập",
    "4": "Độc lập",
    "5": "Tự chủ hoàn toàn"
  }
}
```

**ROLE_CONDITIONAL** (Testing & Documentation):
```json
{
  "type": "ROLE_CONDITIONAL",
  "branches": [
    { "role_code": "SI", "rule": { "type": "ORDINAL_MANUAL" } },
    { "role_code": "SM", "rule": { "type": "ORDINAL_MANUAL" } }
  ]
}
```

### Pseudocode
```
function resolveLevel(evaluationItem, measurement):
    rule = evaluationItem.scoring_rule_snapshot
    switch rule.type:
        case RANGE_THRESHOLD, INVERSE_THRESHOLD:
            for r in rule.ranges:
                if measurement.value >= r.min and (r.max is null or measurement.value <= r.max):
                    return r.level
            return null   // out of range -> flag for manual review
        case COUNT_THRESHOLD:
            for i, threshold in enumerate(rule.thresholds):
                if measurement.value < threshold: return i + 1
            return len(rule.thresholds) + 1
        case ORDINAL_MANUAL:
            return evaluationItem.manual_level   // nhập tay, không tự tính
        case ROLE_CONDITIONAL:
            branch = find(rule.branches, b => b.role_code == evaluation.role_id_snapshot)
            return resolveLevel_withRule(branch.rule, measurement)
```

### Testing strategy cho Rule Engine (data-driven)
- Mỗi `rule_type` có bộ test case dạng bảng: `(rule_config, input_value, expected_level)`.
- Test riêng cho boundary value (vd 69.99 vs 70, 99.99 vs 100).
- Test cho case `null`/out-of-range → phải trả về trạng thái "cần review thủ công", không được throw exception hay tính sai.

---

## 13. Scoring Engine

### Pipeline
```
Measurement → Rule Engine (resolveLevel) → CriterionLevel.score_value (raw_score)
→ weighted_score = (raw_score / max_score_of_criterion) × weight_snapshot
→ overall_score = Σ(weighted_score of active items) / Σ(weight_snapshot of active items) × 100
```

### Pseudocode tổng thể
```
function calculateEvaluation(evaluation):
    activeItems = evaluation.items.filter(i => not i.is_disabled_for_employee)
    totalWeight = 0
    totalWeightedScore = 0

    for item in activeItems:
        if item.scoring_rule_snapshot.type == ORDINAL_MANUAL and item.manual_level is null:
            item.is_missing_score = true
            continue   // không tính, nhưng vẫn liệt kê là pending

        level = RuleEngine.resolveLevel(item, item.measurements)
        item.resolved_level = level
        maxScore = max(item.level_definition_snapshot.map(l => l.score_value))
        levelScore = item.level_definition_snapshot.find(l => l.level_no == level).score_value
        item.raw_score = levelScore
        item.weighted_score = round((levelScore / maxScore) * item.weight_snapshot, 2)

        totalWeight += item.weight_snapshot
        totalWeightedScore += item.weighted_score

    evaluation.manager_score = round((totalWeightedScore / totalWeight) * 100, 2) if totalWeight > 0 else null
    evaluation.final_score = evaluation.manager_score  // trước calibration
    persist(evaluation, activeItems)
    AuditLog.record("SCORE_CALCULATED", evaluation.evaluation_id, ...)
```

**Quyết định quan trọng — có lưu score hay chỉ lưu measurement rồi tính realtime?**
→ **Lưu cả hai.** Lưu `measurement` (nguồn) **và** `resolved_level/raw_score/weighted_score` (kết quả đã tính, persisted) tại thời điểm tính. **Lý do:** (1) Report/dashboard cần query nhanh, không thể tính lại hàng nghìn record mỗi lần xem; (2) Evaluation sau khi lock phải immutable tuyệt đối kể cả khi rule engine code có bug-fix sau này — nếu chỉ lưu measurement và tính lại, một bug-fix trong code sẽ vô tình "sửa" cả lịch sử. **Trade-off:** tốn thêm storage và phải có cơ chế "recalculate" tường minh (action riêng, có audit) khi Manager muốn tính lại trong lúc còn Draft/In Progress.

---

## 14. Evaluation Workflow

### State machine (default, configurable qua `workflow_definition.steps`)
```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> OPEN: Admin opens cycle
    OPEN --> SELF_ASSESSMENT: employee starts (bắt buộc mọi cycle)
    SELF_ASSESSMENT --> MANAGER_ASSESSMENT: employee submits self-score
    MANAGER_ASSESSMENT --> REVIEWING: manager submits
    REVIEWING --> MANAGER_ASSESSMENT: reviewer request correction
    REVIEWING --> CALIBRATION: reviewer approves, cycle có bật calibration
    REVIEWING --> APPROVED: cycle không bật calibration
    CALIBRATION --> APPROVED: calibration committee finalize
    APPROVED --> PUBLISHED: hệ thống tự động publish ngay khi Approved (✅ đã chốt — không có bước "HR bấm Publish" thủ công riêng)
    PUBLISHED --> LOCKED: hết thời hạn / Admin lock thủ công
    LOCKED --> [*]
```

**✅ Đã chốt — Auto-publish:** ngay khi evaluation đạt trạng thái `APPROVED` (tức điểm đã được tính xong và final_score đã chốt — dù có qua CALIBRATION hay không), hệ thống **tự động chuyển sang `PUBLISHED`** trong cùng transaction, nhân viên xem được kết quả **ngay lập tức**, không cần HR thực hiện thêm thao tác "Publish" riêng. `POST /evaluations/{id}/approve` giờ đây thực hiện luôn cả 2 việc: approve + publish (atomic, cùng 1 audit_log ghi rõ 2 sự kiện `APPROVE` và `PUBLISH` hoặc gộp thành 1 sự kiện `APPROVE_AND_PUBLISH`).

### Có nên configurable workflow không?
**Có, nhưng ở mức giới hạn (configurable step toggling, không phải build BPMN engine tự do).** `workflow_definition.steps` là JSON mảng các state cố định trong hệ thống (danh sách state là fixed enum), Admin chỉ được **bật/tắt** step tùy chọn còn lại (**CALIBRATION**) và cấu hình `allowed_roles` cho mỗi transition. **SELF_ASSESSMENT không còn là step tùy chọn** (✅ đã chốt bắt buộc mọi cycle, mục 29 Q3) — luôn có mặt trong mọi workflow, không cấu hình tắt được. **Lý do không cho tự do định nghĩa state mới:** state gắn chặt với business logic khác (báo cáo, lock, audit) — cho phép state tùy ý sẽ phá vỡ tính nhất quán của Reporting/Approval module. **Trade-off:** kém linh hoạt hơn full workflow engine, nhưng đúng tinh thần "tránh over-engineering" của đề bài.

### Permission theo transition (tóm tắt, chi tiết ở mục 17)
| Transition | Role được phép |
|---|---|
| DRAFT → OPEN | HR/Admin |
| → SELF_ASSESSMENT submit | Employee (chính chủ) |
| → MANAGER_ASSESSMENT submit | Team Lead/Manager (của employee đó) |
| → REVIEWING approve/reject | Manager cấp trên hoặc HR (theo config) |
| → CALIBRATION adjust | HR/Admin (calibration committee) |
| → APPROVED | HR/Admin (hoặc reviewer cấp trên theo config) |
| → PUBLISHED | **System (auto, ngay khi vào APPROVED)** — ✅ đã chốt, không còn thao tác thủ công riêng cho HR |
| → LOCKED | System (auto theo `end_date` + grace period) hoặc HR/Admin thủ công |

### Nếu Manager thay đổi score sau khi Employee đã submit self-assessment?
- Self-score và Manager-score là 2 field **riêng biệt** (`evaluation.self_score`, `evaluation.manager_score`) — Manager không ghi đè self-score, chỉ tạo `manager_score` độc lập. Overall/final tính dựa trên `manager_score` (self-assessment chỉ mang tính tham khảo/input, trừ khi template cấu hình `self_weight_percentage` để blend — Phase 2).

---

## 15. CSV Import Design

### Đánh giá CSV template đề xuất trong prompt gốc
Format gốc (`employee_id, employee_name, team, role, evaluation_cycle, criterion_code, measurement_value, measurement_unit, score, comment, evidence`) — đánh giá:
- **Vấn đề:** mỗi dòng = 1 (employee × criterion), nghĩa là 1 employee với 18 criteria = 18 dòng lặp lại `employee_id/name/team/role/cycle` → dư thừa, dễ nhập sai lệch giữa các dòng của cùng 1 employee (vd đổi team ở dòng 5 nhưng quên đổi ở dòng 6).
- **Đề xuất cải tiến:** giữ nguyên format "long/tidy" (1 dòng = 1 measurement) vì **dễ validate & dễ partial-import theo dòng**, nhưng **bỏ `team`, `role`, `employee_name` khỏi input** — hệ thống tự resolve từ `employee_id` + `evaluation_cycle` (tránh dữ liệu thừa gây mâu thuẫn), chỉ giữ:

```csv
employee_id,evaluation_cycle_code,criterion_code,measurement_value,measurement_unit,score_override,comment,evidence_url
```
- `score_override`: optional — nếu HR muốn nhập thẳng score đã biết (bỏ qua Rule Engine), phải có `comment` giải thích lý do (validate ở bước import).
- **Lý do giữ format long thay vì wide (1 dòng/employee, mỗi criterion 1 cột):** wide format dễ đọc bằng mắt nhưng cực khó validate & versioning (mỗi khi thêm criterion phải đổi schema CSV), vi phạm chính nguyên tắc "criteria không cố định" của toàn bộ hệ thống.

### CSV Template Versioning
- `csv_template` + `csv_template_column` (mục 10.6) — version tăng dần, có `effective_from`.
- Backward compatibility: import job ghi nhận `csv_template_id` được dùng; nếu HR upload file theo V1 (thiếu cột `evidence_url` — optional ở V1), hệ thống vẫn chấp nhận nếu cột đó `required=false` trong version đó. **Không cho phép** dùng V1 nếu cột bị đổi kiểu dữ liệu không tương thích ở V2 (semantic breaking change) — trường hợp này bắt buộc dùng V2.

### Sequence
```mermaid
sequenceDiagram
    actor Admin
    participant UI
    participant ImportAPI
    participant Validator
    participant Queue
    participant RuleEngine
    participant DB

    Admin->>UI: Download CSV template (theo cycle đang chọn)
    Admin->>UI: Upload file đã điền
    UI->>ImportAPI: POST /imports/csv (file, cycle_id)
    ImportAPI->>DB: tạo import_job (status=UPLOADED), check file_hash duplicate
    ImportAPI->>Validator: parse + validate từng dòng
    Validator->>DB: ghi import_row (status VALID/INVALID + error_messages)
    ImportAPI-->>UI: trả preview (total, valid, invalid, sample errors theo từng row)
    Admin->>UI: xem chi tiết lỗi, sửa file, upload lại (nếu cần) hoặc Confirm import phần hợp lệ
    UI->>ImportAPI: POST /imports/{id}/confirm
    ImportAPI->>Queue: enqueue job xử lý bất đồng bộ (nếu file lớn)
    Queue->>RuleEngine: với mỗi valid row, tạo/cập nhật evaluation_item + tính score
    Queue->>DB: cập nhật import_row.status=IMPORTED, import_job summary
    Queue-->>UI: (qua polling/API) trả import summary + import history
```

### Partial import vs All-or-nothing
**Quyết định: Partial import theo mặc định, có tùy chọn All-or-nothing.**
- Mặc định: dòng nào valid thì import, dòng lỗi thì skip + báo cáo chi tiết `row_no + error_message` — vì với 1000 dòng, chặn toàn bộ chỉ vì 30 dòng lỗi gây tốn thời gian sửa & re-upload không cần thiết, trong khi 970 dòng đúng đã có thể đưa vào ngay.
- **Trade-off:** dữ liệu có thể "không đồng bộ" tạm thời (1 số employee có data, 1 số chưa) — giảm thiểu bằng cách **không cho evaluation chuyển sang REVIEWING** nếu còn `is_missing_score = true`, nên rủi ro này được chặn ở bước workflow, không phải ở bước import.
- Tùy chọn All-or-nothing: cờ `strict_mode=true` khi confirm import — nếu có bất kỳ dòng invalid nào, không import gì cả (dùng cho các batch quan trọng như batch cuối trước khi lock cycle).

### Chống duplicate import
- `import_job` unique theo `(evaluation_cycle_id, file_hash)` — file giống hệt bị từ chối với thông báo rõ.
- Ở mức row: nếu `(employee_id, criterion_code)` đã có `evaluation_item` với `status != DRAFT` (đã submit) → **row đó là UPDATE có điều kiện**, chỉ cho phép nếu evaluation đang ở state cho phép sửa (`DRAFT`/`IN_PROGRESS`/`MANAGER_ASSESSMENT`), ngược lại → `INVALID: "Evaluation đã submit, không thể import đè"`.

---

## 16. API Design

> Chuẩn chung: JWT Bearer auth, mọi response lỗi theo format thống nhất (mục 21.12), idempotency-key header cho POST tạo mới quan trọng (`/imports/csv`, `/evaluations`).

### Employee & Organization
| Method | Endpoint | Auth | Note |
|---|---|---|---|
| GET | `/employees` | All (scoped) | filter team/role/status, pagination |
| POST | `/employees` | HR/Admin | |
| GET | `/employees/{id}` | Self/Manager/HR | |
| PATCH | `/employees/{id}` | HR/Admin | |
| GET | `/teams`, `/departments`, `/roles`, `/job-levels` | All | reference data |
| POST | `/teams`, `/departments`, `/roles`, `/job-levels` | HR/Admin | |

### Criteria & Template
| Method | Endpoint | Auth | Note |
|---|---|---|---|
| GET | `/criteria` | HR/Admin, Manager (read) | |
| POST | `/criteria` | HR/Admin | tạo criterion mới (definition) |
| POST | `/criteria/{id}/versions` | HR/Admin | tạo criterion_version mới (weight/level/rule) |
| POST | `/criteria/{versionId}/overrides` | HR/Admin | tạo override theo TEAM/ROLE/TEMPLATE |
| GET | `/evaluation-templates` | HR/Admin | |
| POST | `/evaluation-templates` | HR/Admin | |
| POST | `/evaluation-templates/{id}/versions` | HR/Admin | tạo version DRAFT |
| PUT | `/evaluation-templates/{id}/versions/{v}/criteria` | HR/Admin | cấu hình danh sách criterion + weight |
| POST | `/evaluation-templates/{id}/versions/{v}/validate` | HR/Admin | validate tổng weight = 100% trước publish |
| POST | `/evaluation-templates/{id}/versions/{v}/publish` | HR/Admin | publish, chốt effective_weight |

### Evaluation Cycle & Evaluation
| Method | Endpoint | Auth | Note |
|---|---|---|---|
| POST | `/evaluation-cycles` | HR/Admin | |
| GET | `/evaluation-cycles/{id}` | scoped | |
| POST | `/evaluation-cycles/{id}/open` | HR/Admin | sinh `evaluation` cho toàn bộ employee applicable |
| GET | `/evaluations` | scoped | filter cycle/employee/team/status |
| GET | `/evaluations/{id}` | Self/Manager/HR | |
| PUT | `/evaluations/{id}/items/{itemId}` | Employee(self item)/Manager | nhập measurement/score/comment/evidence |
| POST | `/evaluations/{id}/self-submit` | Employee | |
| POST | `/evaluations/{id}/submit` | Manager | validate no missing required score |
| POST | `/evaluations/{id}/request-correction` | Reviewer/HR | |
| POST | `/evaluations/{id}/approve` | HR/Admin/Reviewer (config) | ✅ đã chốt: approve xong tự động publish luôn (atomic), không có endpoint `/publish` riêng cho evaluation |
| POST | `/evaluations/{id}/recalculate` | Manager/HR | trước khi lock, ghi audit |
| POST | `/evaluations/{id}/items/{itemId}/adjust-score` | Manager/HR | tạo `score_adjustment`, reason bắt buộc (400 nếu thiếu); ✅ đã chốt: Manager + HR/Admin, **không** cấp System Admin |
| POST | `/evaluation-cycles/{id}/lock` | HR/Admin | idempotent, chặn mọi write sau đó (409 nếu đã locked) |

### Calibration
| Method | Endpoint | Auth |
|---|---|---|
| POST | `/calibration-sessions` | HR/Admin |
| GET | `/calibration-sessions/{id}/distribution` | HR/Admin |
| POST | `/calibration-sessions/{id}/adjustments` | HR/Admin (reason bắt buộc) |
| POST | `/calibration-sessions/{id}/finalize` | HR/Admin |

### CSV Import
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/csv-templates/{cycleId}/download` | HR/Admin |
| POST | `/imports/csv` | HR/Admin | multipart upload, trả `import_job.id` |
| GET | `/imports/{id}/preview` | HR/Admin | danh sách row + lỗi |
| POST | `/imports/{id}/confirm` | HR/Admin | body: `{ strict_mode: boolean }` |
| GET | `/imports/{id}` | HR/Admin | status/summary |
| GET | `/imports` | HR/Admin | import history, filter theo cycle |

### Reporting & Audit
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/reports/employees/{id}` | Self/Manager/HR |
| GET | `/reports/teams/{teamId}` | Manager(own team)/HR |
| GET | `/reports/organization` | HR/Admin |
| GET | `/audit-logs` | System Admin/HR (read-only) |

### Ví dụ chi tiết 1 API
**POST `/evaluations/{id}/items/{itemId}/adjust-score`**
- Auth: Bearer JWT, role ∈ {MANAGER (own team), HR_ADMIN} — ✅ đã chốt: **không** cấp System Admin (giữ nguyên tắc read-only, mục 6)
- Request:
```json
{ "new_score": 4.2, "reason": "Employee vượt KPI do dự án khẩn cấp Q3, đã xác nhận với PM" }
```
- Validation: `evaluation.is_locked == false`; `reason` bắt buộc ≥ 10 ký tự; `new_score` trong range hợp lệ của criterion.
- Response 200:
```json
{ "evaluation_item_id": "...", "old_score": 3.6, "new_score": 4.2, "audit_log_id": "..." }
```
- Error: `409 EVALUATION_LOCKED`, `400 REASON_REQUIRED`, `403 FORBIDDEN_NOT_TEAM_MANAGER`.
- Idempotency: không cần (mỗi lần gọi tạo 1 adjustment mới có ý nghĩa riêng, không phải tạo tài nguyên trùng).

---

## 17. RBAC — Permission Matrix

| Chức năng | Employee | Manager | HR/Admin | System Admin |
|---|:---:|:---:|:---:|:---:|
| Xem evaluation của chính mình | ✅ | ✅ (team mình) | ✅ (toàn org) | ✅ (read-only) |
| Nhập self-assessment | ✅ (chính chủ) | ❌ | ❌ | ❌ |
| Nhập manager score | ❌ | ✅ (team mình) | ✅ | ❌ |
| Submit evaluation | ✅ (self step) | ✅ | ✅ | ❌ |
| Approve/Reject | ❌ | tùy config | ✅ | ❌ |
| Quản lý Employee/Team | ❌ | ❌ | ✅ | ✅ |
| Quản lý Criteria/Template | ❌ | ❌ (read) | ✅ | ❌ |
| Quản lý Evaluation Cycle | ❌ | ❌ | ✅ | ❌ |
| CSV Import | ❌ | ❌ | ✅ | ❌ |
| Calibration | ❌ | ❌ | ✅ | ❌ |
| Adjust score (override) | ❌ | ✅ (team mình, có reason) | ✅ | ❌ |
| Xem report team | ❌ | ✅ (team mình) | ✅ | ✅ |
| Xem report toàn org | ❌ | ❌ | ✅ | ✅ |
| Xem audit log | ❌ | ❌ | ✅ (business scope) | ✅ (toàn bộ) |
| User/permission management | ❌ | ❌ | ❌ | ✅ |
| Lock cycle | ❌ | ❌ | ✅ | ❌ |

### Mermaid — RBAC model
```mermaid
flowchart LR
    U[User Account] --> R{Role}
    R --> EMP[Employee]
    R --> MGR[Manager/Team Lead]
    R --> HR[HR/Admin]
    R --> SA[System Admin]

    EMP -->|scope: self| P1[View own evaluation, Self-assess]
    MGR -->|scope: own team| P2[Assess team, Adjust score, View team report]
    HR -->|scope: organization| P3[Configure template/criteria, Manage cycle, Import, Calibrate]
    SA -->|scope: system| P4[User mgmt, System config, Full audit read]
```

**Data isolation:** thực hiện ở tầng service (query luôn kèm `team_id`/`manager_id` filter theo JWT claims), không dựa vào UI để ẩn dữ liệu — đảm bảo API cũng không leak dữ liệu ngoài scope.

---

## 18. Audit & Versioning

### Audit event model
Mọi hành động **thay đổi weight, score, level, rule, hoặc quyết định approve/reject/adjust** đều ghi vào `audit_log` (mục 10.7), **được trigger tự động từ application layer (transactional cùng với write nghiệp vụ)**, không phụ thuộc client gọi API audit riêng — tránh trường hợp quên ghi log.

`audit_log` **không có API update/delete** — chỉ có `POST` (nội bộ) và `GET` (System Admin/HR). Ở DB, revoke quyền `UPDATE`/`DELETE` trên bảng này khỏi application role, chỉ cấp `INSERT`/`SELECT`.

### Retention Policy (✅ đã chốt)
- **Audit log & evaluation lịch sử: lưu trữ 2 năm** ở hot storage (query được ngay qua UI). Sau 2 năm → archive job chuyển sang cold storage (vd S3 Glacier/export file nén), **không xóa hẳn** (phòng trường hợp cần tra cứu tuân thủ/khiếu nại sau này).
- Archive job chạy định kỳ (vd hàng tháng), có audit riêng cho chính hành động archive (`entity_type = ARCHIVE_JOB`).
- Đề xuất partition bảng `audit_log` theo tháng để archive/query hiệu quả hơn khi dữ liệu lớn dần.

### Versioning strategy (trả lời trực tiếp câu hỏi mục 23, Q1-Q4)

| Đối tượng | Chiến lược |
|---|---|
| **Criterion** | `criterion_version` — mỗi thay đổi weight/level/rule tạo version mới, version cũ chuyển `status=DEPRECATED`, giữ nguyên `effective_to` |
| **Template** | `evaluation_template_version` — publish-immutable, không sửa được sau khi PUBLISHED, chỉ tạo version mới |
| **Evaluation** | Không versioning riêng — **snapshot toàn bộ vào `evaluation_item`** tại thời điểm evaluation được tạo (mục 10.3) |
| **CSV Template** | `csv_template` version_no tăng dần, cũ → DEPRECATED nhưng vẫn đọc được cho import history cũ |

**Trả lời Q2 (có nên snapshot criterion vào EvaluationItem?): Có, bắt buộc.** Đây là quyết định kiến trúc trung tâm của toàn bộ LLD — nếu không snapshot, sửa 1 criterion sẽ vô tình làm sai lệch điểm của evaluation cũ đã lock, vi phạm trực tiếp yêu cầu "dữ liệu lịch sử phải được bảo toàn" (mục 4 prompt gốc).

**Trả lời Q3 (Weight nên nằm ở Criterion hay Template?):** Nằm ở **cả hai với vai trò khác nhau** — `criterion_version.default_weight` là gợi ý mặc định (Global), `template_criterion.effective_weight` là giá trị **thực sự dùng để tính điểm** sau khi resolve precedence. Không đặt weight duy nhất ở Criterion vì sẽ không hỗ trợ được override theo Team/Role/Template.

**Trả lời Q4 (criterion thay đổi giữa 2 cycle):** Cycle N dùng `template_version` đã publish tại thời điểm mở cycle; khi Admin sửa criterion sau đó, chỉ tạo `criterion_version` mới + `template_version` mới, **cycle N vẫn tham chiếu `template_version` cũ nguyên vẹn** — không có migration ngược.

**Trả lời Q17 (weight đổi khi evaluation đang In Progress):** Weight thay đổi chỉ áp dụng cho **template_version mới**; evaluation đang In Progress vẫn dùng snapshot đã tạo từ đầu, **không tự động áp dụng** thay đổi. Nếu Admin thực sự muốn áp dụng ngay, phải dùng action `recalculate` tường minh (có audit, có cảnh báo "sẽ ảnh hưởng N evaluation đang mở").

**Trả lời Q16 (criterion bị disable, evaluation cũ có ảnh hưởng không?):** Không — vì evaluation cũ chỉ tham chiếu snapshot, `criterion.active=false` chỉ ảnh hưởng đến việc criterion đó **không xuất hiện trong template_version mới**, không đụng tới evaluation_item đã tồn tại.

---

## 19. Reporting

### Query strategy
- Dùng **read-model/materialized view** riêng cho Reporting module (không query trực tiếp bảng OLTP `evaluation_item` cho dashboard tổng hợp), refresh theo batch (sau mỗi lần cycle chuyển state quan trọng, hoặc theo lịch mỗi giờ) — tránh ảnh hưởng hiệu năng ghi của Evaluation module.
- Index chính: `evaluation(evaluation_cycle_id, team_id_snapshot)`, `evaluation_item(evaluation_id, template_criterion_id)`, composite index cho report theo category: `(evaluation_cycle_id, criterion_code_snapshot)`.

### Nội dung report
- **Employee:** overall score, score theo category/criterion, so sánh cycle trước (join theo `employee_id` qua các cycle), strength/weakness (criterion có score cao/thấp nhất).
- **Team:** average, distribution (histogram theo score range), criterion average, completion rate (`Σ evaluation status=DONE / Σ evaluation total`).
- **Organization:** distribution toàn org, so sánh department/team, trend theo cycle.

### Privacy & permission khi xem ranking (✅ đã chốt — siết chặt hơn bản draft)
- **Không ai được xem xếp hạng/vị trí của nhân viên khác so với đồng nghiệp, dưới bất kỳ hình thức nào — kể cả ẩn danh.** Bỏ hẳn tùy chọn "top X% team" đã đề xuất ở bản draft trước.
- Employee: chỉ xem điểm/breakdown của **chính mình**, không có bất kỳ chỉ số so sánh tương đối nào với đồng nghiệp.
- Manager: xem được **aggregate** của team mình (average, distribution/histogram theo score range) — đây là số liệu tổng hợp, không phải xếp hạng từng cá nhân, nên vẫn cho phép; **không** được xem "nhân viên A đứng thứ mấy trong team".
- HR/Admin: xem được aggregate toàn org/department/team; muốn xem điểm chi tiết 1 cá nhân cụ thể thì được (đúng vai trò), nhưng **không cung cấp bất kỳ tính năng "so sánh/xếp hạng nhân viên A vs B" nào trên UI hay API** — kể cả HR.
- Export dữ liệu cá nhân vẫn phải ghi `audit_log` (action `EXPORT`) vì là PII nhạy cảm.
- **Lưu ý implementation:** đây là lý do mục 2 (Non-goals) đã loại "ranking/stack-ranking tự động" khỏi MVP — quyết định lần này xác nhận **luôn, kể cả Phase 2 cũng không nên làm** trừ khi có yêu cầu nghiệp vụ rất rõ ràng sau này.

---

## 20. UI/UX Screen List

### Admin
| Screen | Purpose | Actions chính | Permission |
|---|---|---|---|
| Dashboard | Tổng quan completion rate, cycle đang mở | View | HR/Admin |
| Employee Management | CRUD employee | Create/Edit/Deactivate | HR/Admin |
| Criterion Management | List/tạo criterion, xem version history | Create version, view diff | HR/Admin |
| **Evaluation Template Builder** | Kéo-thả criterion vào template, set weight, xem tổng % realtime | Add/remove criterion, configure level/rule, validate, publish | HR/Admin |
| Evaluation Cycle Management | Tạo cycle, chọn template, mở/đóng/lock | Open/Lock cycle | HR/Admin |
| CSV Template Management | Xem/tạo version CSV template | Publish version | HR/Admin |
| Import Center | Upload, xem preview lỗi, confirm import, lịch sử | Upload/Confirm | HR/Admin |
| Audit Log | Tìm kiếm log theo entity/user/thời gian | View (read-only) | HR/Admin, System Admin |

### Manager
| Screen | Purpose | Permission |
|---|---|---|
| My Team | Danh sách nhân viên, trạng thái evaluation | Manager |
| Employee Evaluation | Nhập score/measurement/comment theo từng criterion | Manager (team mình) |
| Evidence Review | Xem evidence, link PR/report | Manager |
| Calibration (view) | Xem distribution team mình trong phiên calibration | Manager (read) |
| Submit/Approve | Submit sau khi hoàn tất | Manager |

### Employee
| Screen | Purpose | Permission |
|---|---|---|
| My Evaluation | Xem điểm, comment, breakdown theo category | Self |
| Self Assessment | Nhập self-score nếu cycle bật | Self |
| Evaluation History | Xem các cycle trước | Self |

### UX Principle — Template Builder (low-code)
- Giao diện dạng: chọn Category → kéo Criterion từ "Criterion Library" vào panel bên phải → nhập % weight → hệ thống hiển thị **tổng % realtime với cảnh báo màu đỏ nếu ≠ 100%** → với mỗi criterion, mở rộng để cấu hình Level (5 ô nhập label + score) và Rule (chọn `rule_type` từ dropdown → form động hiện ra theo type, ví dụ RANGE_THRESHOLD hiện bảng range input).
- Không có bước nào yêu cầu biết SQL/JSON thô — `rule_config jsonb` được UI serialize/deserialize tự động thành form.
- Nút "Validate" gọi `POST /evaluation-templates/{id}/versions/{v}/validate` trước khi cho phép "Publish" active.

---

## 21. Security

### Authentication — Google Workspace SSO (✅ tính năng mới, thay thế "OAuth2/OIDC generic" ở bản draft trước)

**Quyết định:** dùng **Google OAuth 2.0 / OpenID Connect** làm phương thức đăng nhập **duy nhất** cho MVP (không làm email+password riêng), giới hạn theo domain công ty (vd `@cyberlogitec.com`).

**Login/Register flow:**
```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend (Auth Module)
    participant Google as Google OAuth/OIDC
    participant DB

    User->>FE: Click "Sign in with company Google account"
    FE->>Google: Redirect tới Google consent screen (kèm param hd=<company_domain>)
    User->>Google: Chọn account công ty, cấp quyền
    Google-->>FE: Redirect về callback URL kèm authorization code
    FE->>BE: POST /auth/google/callback { code }
    BE->>Google: Exchange code lấy ID token (server-to-server)
    Google-->>BE: ID token (JWT ký bởi Google)
    BE->>BE: Verify chữ ký (Google public keys), verify email_verified=true
    BE->>BE: Verify email domain == company domain (server-side, KHÔNG chỉ tin claim "hd")
    alt Email không đúng domain công ty
        BE-->>FE: 403 INVALID_DOMAIN
    else Domain hợp lệ nhưng không tìm thấy employee tương ứng
        BE->>DB: tìm employee theo email — không thấy
        BE-->>FE: 403 EMPLOYEE_NOT_PROVISIONED ("Tài khoản chưa được HR khởi tạo")
        BE->>DB: audit_log (action=LOGIN_DENIED)
    else Hợp lệ, có employee tương ứng
        BE->>DB: tìm/tạo user_account (liên kết employee_id, lưu google_sub)
        BE->>DB: audit_log (action = CREATE nếu lần đầu, LOGIN nếu đã tồn tại)
        BE-->>FE: internal session JWT (access + refresh token)
    end
```

**Nguyên tắc bảo mật quan trọng:**
- **Không được chỉ tin tham số `hd` (hosted domain)** trong request/response — đây chỉ là gợi ý UX (lọc danh sách account hiển thị), **có thể bị giả mạo**. Backend **luôn** verify domain bằng cách so khớp phần sau `@` của `email` trong ID token đã verify chữ ký, với domain công ty đã cấu hình (`cyberlogitec.com`), server-side, mỗi lần login.
- Cũng verify `email_verified: true` trong ID token — Google có thể trả về email chưa xác thực trong 1 số edge case (tài khoản G Suite legacy).
- **"Register" không phải self-serve form** — nghĩa là: user **không tự tạo employee record mới** qua màn hình login. Lần đầu login bằng Google chỉ **kích hoạt** (activate) `user_account` cho **employee đã tồn tại sẵn** trong hệ thống (do HR tạo qua `POST /employees`, mục 16). Nếu email Google không khớp bất kỳ `employee.email` nào → từ chối login, hướng dẫn liên hệ HR. **Lý do:** employee là business entity do HR quản lý (nguồn sự thật cho org chart, RBAC scope) — cho phép tự đăng ký sẽ phá vỡ tính toàn vẹn dữ liệu tổ chức.
- Google `sub` (subject ID) là định danh chính lưu trong `user_account.google_sub` — **không dùng email làm khóa chính** vì email có thể đổi (đổi tên, đổi phòng ban dùng email khác) trong khi `sub` không đổi.
- Session: access token (JWT) thời hạn ngắn (vd 15-30 phút) + refresh token (vd 7 ngày, rotate mỗi lần dùng). Refresh token lưu ở HttpOnly cookie, không lưu localStorage (chống XSS đánh cắp token).

**API bổ sung (mục 16):**
| Method | Endpoint | Auth | Note |
|---|---|---|---|
| GET | `/auth/google/login` | Public | redirect tới Google consent screen, kèm `hd=<company_domain>` |
| POST | `/auth/google/callback` | Public | nhận `code`, verify, tạo/liên kết `user_account`, trả session token |
| POST | `/auth/refresh` | Refresh token | cấp access token mới |
| POST | `/auth/logout` | Bearer JWT | revoke refresh token hiện tại |
| GET | `/auth/me` | Bearer JWT | trả thông tin actor hiện tại (employee_id, access_role, team scope) — dùng cho FE init state |

**Cấu hình cần chuẩn bị trước khi implement:**
- Google Cloud Console: tạo OAuth 2.0 Client (Web application), khai báo Authorized redirect URI.
- Biến môi trường: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `COMPANY_EMAIL_DOMAIN=cyberlogitec.com`.
- Nếu công ty dùng Google Workspace (không phải Gmail cá nhân), có thể cân nhắc thêm bước xác nhận qua **Google Workspace Admin SDK** để kiểm tra user đang active trong tổ chức Workspace (Phase 2 — không bắt buộc MVP, domain-check đã đủ an toàn cho hầu hết trường hợp).

- **Authorization:** RBAC + resource-scoping (team/self) enforce ở service layer, không chỉ ở UI — dùng `user_account.access_role` (mục 10.8) làm nguồn RBAC group, kết hợp `employee.manager_id`/`team_id` cho scope filter.
- **Data isolation:** mọi query có scope filter bắt buộc theo JWT claims (`employee_id`, `managed_team_ids`).
- **Encryption:** at-rest (DB-level encryption), in-transit (TLS 1.2+).
- **PII protection:** email/full_name là PII — mask trong log ngoài audit_log chính thức; export report cá nhân ghi audit.
- **Rate limiting** cho `/imports/csv`, `/reports/*`, và `/auth/google/callback` (chống brute-force/abuse endpoint auth) để tránh abuse.

---

## 22. Performance & Scalability

- **Quy mô (✅ đã HR/Product xác nhận):** ~1,000 employees, ~50 concurrent users giờ cao điểm, CSV import tối đa ~5,000 rows/file. Ở quy mô này, materialized view refresh theo batch (mục 19) và cache Redis TTL 15 phút là đủ dùng — **không cần** tối ưu sớm (premature optimization) cho scale >5,000 employee.
- CSV import >500 rows → xử lý **bất đồng bộ qua job queue**, trả `import_job.id` ngay, client poll status — tránh timeout HTTP.
- Report query dùng materialized view + cache (Redis) TTL ngắn (~15 phút) cho dashboard tổng hợp.
- Batch tính score khi import dùng bulk insert/transaction theo batch 100-200 rows, tránh 1 transaction khổng lồ.

---

## 23. Error Handling

Chuẩn hóa response lỗi:
```json
{
  "error": {
    "code": "EVALUATION_LOCKED",
    "message": "Evaluation đã bị khóa, không thể chỉnh sửa.",
    "field": null,
    "details": []
  }
}
```
- CSV import validation error trả **mảng chi tiết theo dòng**:
```json
{
  "error": { "code": "IMPORT_VALIDATION_FAILED", "message": "30/1000 dòng lỗi" },
  "row_errors": [
    { "row_no": 15, "field": "criterion_code", "message": "Criterion 'XYZ' không tồn tại hoặc không applicable cho role của employee" },
    { "row_no": 42, "field": "measurement_value", "message": "Giá trị phải là số" }
  ]
}
```
- HTTP status convention: 400 validation, 401 unauthenticated, 403 forbidden (sai scope), 404 not found, 409 conflict (vd đã locked/duplicate import), 422 business rule violation (vd tổng weight ≠ 100%), 500 unexpected.

---

## 24. Transaction & Concurrency

| Case | Giải pháp |
|---|---|
| Concurrent evaluation update (2 tab cùng sửa 1 evaluation_item) | **Optimistic locking** — cột `version int` trên `evaluation_item`, so khớp khi UPDATE, trả `409 CONFLICT` nếu mismatch |
| Concurrent approval (2 người cùng approve) | Transition state machine kiểm tra `status` hiện tại trong cùng transaction (SELECT FOR UPDATE) trước khi chuyển state |
| Duplicate CSV import | Unique `(evaluation_cycle_id, file_hash)` + check ở `import_row` level như mục 15 |
| Double submit | Idempotency-key header cho `POST /evaluations/{id}/submit`; hoặc kiểm tra `status` hiện tại (nếu đã SUBMITTED thì trả 409, không tạo hành động trùng) |
| Lock cycle giữa lúc đang có transaction ghi | `evaluation_cycle.status` transition dùng row lock; mọi API ghi evaluation kiểm tra `cycle.status NOT IN (LOCKED)` trong cùng transaction trước khi commit |

---

## 25. Testing Strategy

- **Unit test:** Rule Engine (data-driven theo mục 12), Scoring Engine pipeline, Precedence resolver (mục 11).
- **Integration test:** Import flow end-to-end (upload → validate → confirm → evaluation_item tạo đúng), Workflow transition đúng permission.
- **API test:** contract test cho từng endpoint mục 16, đặc biệt error case (missing reason, locked cycle).
- **Rule engine test:** boundary value, out-of-range, role-conditional branch.
- **CSV validation test:** file lỗi định dạng, thiếu cột required, duplicate row, employee không tồn tại.
- **Permission test:** ma trận RBAC mục 17 — test âm (Employee gọi API Admin phải 403).
- **Workflow test:** đảm bảo không thể skip state (vd submit thẳng LOCKED).
- **Regression test:** snapshot evaluation cũ không đổi sau khi sửa criterion/template mới.

---

## 26. Deployment Architecture

```mermaid
flowchart LR
    subgraph "Client"
        Browser
    end
    subgraph "Edge"
        LB[Load Balancer / API Gateway]
    end
    subgraph "App Tier (Modular Monolith, horizontally scalable stateless instances)"
        App1[App Instance 1]
        App2[App Instance 2]
    end
    subgraph "Async"
        Worker[Background Worker - Import/Report jobs]
        MQ[(Message Queue)]
    end
    subgraph "Data Tier"
        PG[(PostgreSQL - Primary)]
        PGR[(PostgreSQL - Read Replica, cho Reporting)]
        Redis[(Redis Cache)]
        S3[(Object Storage - CSV/Evidence files)]
    end

    Browser --> LB --> App1
    LB --> App2
    App1 --> MQ --> Worker
    App1 --> PG
    App2 --> PG
    Worker --> PG
    App1 --> Redis
    App1 --> S3
    App1 -.read report.-> PGR
```

- Deploy: containerized (Docker), CI/CD pipeline chuẩn, DB migration tool (Flyway/Liquibase) chạy tự động, có rollback plan.
- Environment: Dev → Staging → Production, seed data 18 KPI mẫu chỉ load ở Dev/Staging làm demo, **không hard-code vào migration production** (nạp qua Import/UI như dữ liệu thật).

---

## 27. Technology Recommendation

| Layer | Recommended Stack | Alternative | Trade-off |
|---|---|---|---|
| Frontend | React + TypeScript, TanStack Query, shadcn/ui | Vue 3 + TS | React có ecosystem lớn hơn cho form builder phức tạp (Template Builder) |
| Backend | Node.js (NestJS, TypeScript) hoặc Java (Spring Boot) | Python (FastAPI) | NestJS/Spring Boot có module system rõ ràng, phù hợp Modular Monolith; FastAPI nhanh để viết nhưng module boundary phải tự kỷ luật hơn |
| Database | PostgreSQL (hỗ trợ JSONB tốt cho `rule_config`) | MySQL 8 | Postgres JSONB + GIN index mạnh hơn cho query rule config |
| Cache | Redis | Memcached | Redis hỗ trợ cấu trúc phức tạp hơn (cần cho report cache/session) |
| File storage | S3-compatible (MinIO on-prem hoặc AWS S3) | Local disk | Cần scale & backup dễ dàng cho CSV/evidence |
| Auth | **Google OAuth2/OIDC** (`accounts.google.com`), domain-restricted (✅ đã chốt — xem mục 21) | Keycloak/Auth0 self-host | Công ty đã dùng Google Workspace cho email nội bộ nên tận dụng làm IdP trực tiếp, không cần thêm hạ tầng identity provider riêng; trade-off: phụ thuộc uptime của Google (chấp nhận được vì công ty vốn đã phụ thuộc Google Workspace cho email) |
| Background job | BullMQ (Node) / Spring Batch (Java) + Redis/RabbitMQ | AWS SQS | Tùy hạ tầng sẵn có; BullMQ đơn giản nếu đã chọn Node |
| Reporting | Materialized view trong Postgres + Metabase (cho HR tự khám phá data) | Dedicated BI (Looker) | Metabase đủ dùng ở quy mô MVP, chi phí thấp |
| Logging | ELK stack hoặc Loki+Grafana | CloudWatch (nếu AWS) | Tùy hạ tầng |
| Monitoring | Prometheus + Grafana | Datadog | Prometheus mã nguồn mở, không phụ thuộc vendor |

---

## 28. Risks & Trade-offs — Top 10 Technical Risks

1. **Rule engine "cứng" 5 strategy** có thể không đủ nếu tương lai có nhu cầu công thức phức tạp hơn nhiều (đa biến, ngoại lệ chồng chéo) → cần review lại nếu request tăng.
2. **`rule_config`/snapshot JSONB** khó query/report trực tiếp bằng SQL thường — cần chuẩn hóa read-model riêng cho Reporting.
3. **Denormalize `effective_weight` tại publish-time** → nếu resolver logic có bug, phải phát hiện *trước* khi publish (validate kỹ), vì sau publish rất khó "vá ngầm" mà không phá vỡ tính snapshot.
4. **CSV partial-import** có thể để lại dữ liệu tạm thời không đồng bộ nếu Admin không hoàn tất đúng quy trình — cần cảnh báo rõ trên UI.
5. **Optimistic locking** trên `evaluation_item` có thể gây trải nghiệm khó chịu nếu 2 Manager cùng sửa 1 employee (hiếm nhưng cần UX xử lý conflict rõ ràng).
6. **Materialized view lag** cho Reporting → số liệu real-time có thể trễ vài phút, cần truyền đạt rõ cho user ("Data as of ...").
7. **Migration khi thêm `rule_type` mới trong tương lai** vẫn cần deploy code (chấp nhận trade-off đã nêu ở mục 12) — cần quy trình release rõ ràng khi việc này xảy ra.
8. **Employee đổi team/role giữa cycle** — snapshot tại thời điểm tạo evaluation (đầu cycle). **Đã chốt với HR** (xem mục 30, Q1) — rủi ro còn lại chỉ là communication: cần thông báo rõ cho Manager mới biết họ **không** đánh giá nhân viên vừa chuyển đến giữa chừng cycle hiện tại.
9. **Import file lớn (>10,000 rows)** có thể cần streaming parser thay vì load toàn bộ vào memory — cần benchmark thực tế trước khi go-live.
10. **Audit log & evaluation lịch sử — ✅ đã chốt retention = 2 năm.** Cần implement archive job (chuyển dữ liệu >2 năm sang cold storage, không xóa hẳn — vẫn giữ được cho mục đích tuân thủ nếu cần) chạy định kỳ; cân nhắc partition bảng `audit_log` theo tháng/quý để archive job không phải quét full table.

---

## 29. Top 10 Business Decisions cần chốt trước khi Development

1. Precedence Template > Team > Role > Global — HR có đồng ý Template luôn thắng tuyệt đối không?
2. Strict validate tổng weight = 100% khi publish — có chấp nhận chặn cứng, hay cần cho phép ngoại lệ?
3. ~~Self-assessment có bắt buộc mặc định cho mọi cycle không, hay optional per-cycle?~~ **✅ Đã chốt: bắt buộc mọi cycle**, không cấu hình tắt được (khác với CALIBRATION vẫn togglable).
4. Calibration có bắt buộc ở mọi cycle hay chỉ cycle cuối năm?
5. ~~Ranking cá nhân — tổ chức có muốn cho phép xem (dù ẩn danh) hay tuyệt đối không?~~ **✅ Đã chốt: tuyệt đối không**, kể cả ẩn danh (xem mục 19).
6. ~~Nhân viên chuyển team giữa cycle — dùng team tại thời điểm mở cycle hay tại thời điểm submit?~~ **Đã chốt:** dùng team tại thời điểm **mở cycle** (đầu cycle) — đúng theo default đã thiết kế ở mục 10.1.
7. Quy tắc rounding — 2 chữ số thập phân có phù hợp với chính sách lương thưởng liên quan (nếu evaluation ảnh hưởng compensation)?
8. Evidence bắt buộc hay optional — mức độ enforce khác nhau theo criterion nào?
9. Ai có quyền approve cuối cùng — Manager cấp trên hay luôn là HR? (ảnh hưởng trực tiếp `workflow_definition`)
10. Thời gian retention của audit log & evaluation lịch sử (bao nhiêu năm) — ảnh hưởng chiến lược archive (Risk #10).

---

## 30. Open Questions (tổng hợp từ giả định đã chọn mặc định)

| # | Câu hỏi | Default đã chọn | Cần chốt bởi |
|---|---|---|---|
| 1 | Nhân viên chuyển team giữa cycle xử lý sao? | **✅ Đã chốt:** Snapshot team tại thời điểm tạo evaluation (đầu cycle) | HR |
| 2 | Có multi-organization không? | Không (MVP single-org) | Product Owner |
| 3 | Self-score có blend vào final score không? | Không, chỉ tham khảo (Phase 2 mới blend) | HR |
| 4 | Weight ≠ 100% có được publish không? | Không, strict block | HR/Admin |
| 5 | Evidence bắt buộc mức nào? | Cảnh báo, không chặn submit | HR |
| 6 | Quy mô hệ thống (số employee) thực tế? | **✅ Đã chốt:** ~1,000 employees | Product Owner |
| 7 | Có cần tích hợp Jira/Git ở MVP không? | Không, để Phase 2 | Product Owner |
| 8 | Approval cuối cùng do ai? | Configurable theo `workflow_definition`, mặc định HR | HR |
| 9 | Retention audit log bao lâu? | **✅ Đã chốt: 2 năm**, sau đó archive (cold storage, không xóa hẳn) | Compliance/HR |
| 10 | Ranking có hiển thị không? | **✅ Đã chốt: Không**, cho bất kỳ role nào, kể cả ẩn danh | HR |

---

## 31. Implementation Roadmap (đề xuất)

**Phase 0 — Foundation (2-3 tuần)**
IAM/RBAC, Organization module (Employee/Team/Role/JobLevel CRUD), audit log infra.

**Phase 1 — Core Configuration (3-4 tuần)**
Criterion/CriterionVersion/Override, Evaluation Template Builder UI, precedence resolver, publish validation.

**Phase 2 — Rule & Scoring Engine (2-3 tuần)**
5 rule strategies, Scoring Engine pipeline, unit test data-driven đầy đủ.

**Phase 3 — Evaluation Core (3-4 tuần)**
Evaluation Cycle, Evaluation/EvaluationItem, Manual entry UI, Workflow state machine cơ bản (không calibration).

**Phase 4 — CSV Import (2-3 tuần)**
CSV Template versioning, parse/validate/preview, partial import, import history.

**Phase 5 — Reporting & Calibration (2-3 tuần)**
Dashboard cơ bản, materialized views, Calibration module.

**Phase 6 — Hardening (2 tuần)**
Security review, performance test (import lớn, concurrent), UAT với 18 KPI mẫu làm seed data thật.

**Tổng ước lượng MVP: ~16-20 tuần** với team 4-6 người (2 BE, 1-2 FE, 1 QA, 1 PM/BA).

---

## Phụ lục A — Mapping 18 KPI mẫu sang mô hình mới (minh họa seed data)

| Criterion mẫu | rule_type đề xuất | Ghi chú |
|---|---|---|
| On-time Completion | RANGE_THRESHOLD | |
| Plan/Milestone Adherence | ORDINAL_MANUAL | mô tả định tính theo level |
| Estimation & Planning Discipline | ORDINAL_MANUAL | |
| Ownership Scope | ORDINAL_MANUAL | |
| Independence | ORDINAL_MANUAL | |
| Task Quality — Bug & Rework | INVERSE_THRESHOLD | |
| Production Incident | INVERSE_THRESHOLD | |
| Core Engineering Skillset | ORDINAL_MANUAL | qua technical interview/PR review |
| SQL & Database | ORDINAL_MANUAL | |
| Code Review & Feedback | ROLE_CONDITIONAL → COUNT_THRESHOLD | số góp ý theo level |
| Testing & Documentation | ROLE_CONDITIONAL | SI/SM khác nhau |
| Business Domain Knowledge | ORDINAL_MANUAL | |
| Mentoring | COUNT_THRESHOLD | số mentee |
| Knowledge Sharing | COUNT_THRESHOLD | số bài chia sẻ |
| Teamwork & Communication | ORDINAL_MANUAL | |
| Customer Communication & English | ORDINAL_MANUAL | kèm CEFR level làm evidence |
| Proposing Improvements | COUNT_THRESHOLD | |
| Attitude & Company Culture | ORDINAL_MANUAL | |

> 18 dòng này sẽ được nạp vào hệ thống **qua chính tính năng CSV Import / Template Builder** (không migration cứng), đóng vai trò demo data đầu tiên cho template "2026 Engineering Evaluation".

---

## Changelog v1.0 → v1.2

| # | Thay đổi | Vị trí |
|---|---|---|
| 1 | Team chuyển giữa cycle: xác nhận dùng team lúc **mở cycle** | Mục 28 (Risk #8), 29 (Q6), 30 (Q1) |
| 2 | Kết quả evaluation: **tự động publish cho nhân viên xem ngay sau khi tính điểm** (ngay khi vào trạng thái APPROVED) — không còn thao tác "HR bấm Publish" thủ công riêng | Mục 5, 14, 16 |
| 3 | Quyền override score: Manager (team mình) + HR/Admin. **System Admin giữ nguyên read-only**, không có quyền override (đúng nguyên tắc gốc, đã xác nhận lại) | Mục 6, 11, 16, 17 |
| 4 | Self-assessment: **bắt buộc mọi cycle**, không còn optional/toggle | Mục 5, 6, 14, 29 (Q3) |
| 5 | Ranking: **tuyệt đối không** cho xem xếp hạng nhân viên khác, kể cả ẩn danh (chỉ giữ aggregate/distribution) | Mục 2, 19, 29 (Q5), 30 (Q10) |
| 6 | Quy mô hệ thống: **~1,000 employees** (đã chốt, không còn là giả định) | Mục 22, 30 (Q6) |
| 7 | Retention audit log & evaluation lịch sử: **2 năm**, sau đó archive | Mục 18 (mới: Retention Policy), 28 (Risk #10), 30 (Q9) |
| 8 | **[MỚI] Google Workspace SSO** — login/register giới hạn theo domain công ty, không còn email+password | Mục 9 (ERD), 10.8 (mới: `user_account`), 16 (auth endpoints), 21 (Security), 27 (Tech stack) |

> **Lưu ý:** thay đổi #2 (weight = 100% mới publish template, mục 11/16/20) **vẫn giữ nguyên như bản gốc** — câu trả lời ban đầu về "publish ngay tại lúc tính" thực chất áp dụng cho **luồng publish kết quả evaluation cho nhân viên** (workflow APPROVED→PUBLISHED, mục 14), không phải cho luồng publish Template. Business Decision #2 (mục 29) và Open Question #4 (mục 30) về weight validation **vẫn còn open**, chưa có xác nhận riêng.

---

*Hết tài liệu — v1.2.*