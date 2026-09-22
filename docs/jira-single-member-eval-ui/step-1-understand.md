# Step 1: Understand

Status: produced during this step

## Deliverable
Goal: Provide an interactive Web UI for Manager/HR Admin to select 1 employee from Ky Luong's team, trigger Jira crawl + Google Gemini AI evaluation on demand, and view/apply results directly to their KPI evaluation.

Expected Behavior:
- User selects an employee from dropdown.
- User clicks "Cào Jira & Chấm điểm Gemini AI".
- UI displays metrics, level (1-5), Gemini comments/rationales, and Jira evidence links.
- User clicks "Áp dụng vào phiếu đánh giá" to save.

Acceptance Criteria:
1. Backend REST endpoints for members, single-member evaluation, and apply.
2. Frontend interactive UI in Data Ingestion Hub.
3. Typecheck and unit tests passing.
