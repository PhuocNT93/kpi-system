# Calibration Feature — Frontend User Guide

## Overview
The Calibration module enables Human Resources Administrators (`HR_ADMIN`) to review performance score distributions, perform manual calibrated adjustments with mandatory reasons, and finalize calibration sessions with automatic publication (`CALIBRATION -> APPROVED -> PUBLISHED`).

## Access & Permissions
- **Permitted Role**: `HR_ADMIN` only.
- **Unauthorized Roles**: `EMPLOYEE`, `MANAGER`, `SYSTEM_ADMIN` receive a `403 Forbidden` screen and the Calibration navigation entry is hidden from the sidebar.

## Prerequisites & Startup
- Backend API running on `http://localhost:3000` (or configured `VITE_API_URL`).
- Frontend running on `http://localhost:5173`.
- Evaluation cycle created with applicable evaluations in review/calibration status.

## User Interface Walkthrough

### 1. Navigation & Access
- Log in as an `HR_ADMIN` user.
- In the sidebar under **Configuration**, select **Calibration**.

### 2. Selecting Evaluation Cycle & Session
- **Evaluation Cycle selector**: Choose an active or historical evaluation cycle.
- **Calibration Session selector**: Switch between existing sessions or create a new session.

### 3. Creating a Calibration Session
- Click **Tạo phiên hiệu chuẩn mới** (Create New Calibration Session).
- Choose **Phạm vi hiệu chuẩn (Scope)**:
  - `Toàn công ty (Org-wide)`: Includes all eligible evaluations in the cycle.
  - `Theo phòng ban (Department)`: Displays a dynamic department selector.
  - `Theo nhóm dự án (Team)`: Displays a dynamic team selector.
- Click **Tạo phiên hiệu chuẩn** to initialize the session.

### 4. Inspecting Score Distribution
- View descriptive statistics derived strictly from `overall_weighted_score`:
  - **Tổng nhân sự (Total Evaluations)**
  - **Điểm trung bình (Average Score)**
  - **Trung vị (Median Score)**
  - **Min / Max Scores**
- Score distribution progress bar and count per grade band (< 60, 60-69, 70-79, 80-89, >= 90).
- No ranking, percentile, or bell curves are computed or displayed.

### 5. Adjusting Employee Final Score
- Locate employee in the dense evaluation table.
- Click **Hiệu chuẩn điểm** (Calibrate Score).
- In the modal:
  - Review read-only **Điểm tính toán gốc (Calculated Score)**.
  - Review read-only **Điểm cuối hiện tại (Current Final Score)**.
  - Input **Điểm hiệu chuẩn mới (Final Score)** (valid 0.00 – 100.00).
  - Enter mandatory **Lý do điều chỉnh (Reason)** (minimum 3 characters). Whitespace-only reasons are rejected.
  - Click **Lưu hiệu chuẩn** to submit.
- The change is saved atomically with an immutable audit log and appears in the **Lịch sử các lần hiệu chuẩn** log.

### 6. Finalizing a Calibration Session
- When adjustments are complete, click **Chốt phiên hiệu chuẩn (Finalize)**.
- Confirm the dialog acknowledging that:
  - The session will transition to `FINALIZED` and become permanent/read-only.
  - Evaluations in scope will transition to `APPROVED` and auto-publish to `PUBLISHED`.
- The UI immediately switches to locked read-only state.

### 7. Read-Only / Locked State
- If the session is `FINALIZED` or the cycle is `LOCKED`:
  - Adjustment buttons and Finalize buttons are disabled.
  - Status banner displays `ĐÃ CHỐT (FINALIZED)` or `LOCKED`.
  - Clear messaging explains that editing is disabled.
