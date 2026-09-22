# Frontend User Guide: Role-Based Dashboard & Summary Statistics

## Overview
The Role-Based Dashboard is the central landing page upon user login in the Employee Performance Evaluation Management System. It delivers role-tailored summary statistics, KPI progress, workflow distribution, review cadence tracking, and actionable next steps without exposing individual rankings or stack-ranking comparisons.

## Prerequisites
- Node.js 20+
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Active user session with authenticated JWT token containing one of the 4 roles:
  - `EMPLOYEE`
  - `MANAGER`
  - `HR_ADMIN`
  - `SYSTEM_ADMIN`

## Startup and Shutdown Commands

### Running Locally
```bash
# In frontend directory
cd frontend
npm install
npm run dev
```
The application will start on `http://localhost:5173`.

### Typecheck & Test Commands
```bash
# In frontend directory
npm run typecheck
npm run test
```

### Shutdown
Press `Ctrl+C` in the terminal to terminate the Vite development server.

## Configured URLs
- Dashboard Route: `/admin/dashboard`
- Dashboard Alias: `/dashboard` (redirects to `/admin/dashboard`)
- Direct Deep Links:
  - My Evaluations: `/admin/my-evaluations`
  - Team Evaluations: `/admin/team-evaluations`
  - Evaluation Cycles: `/admin/cycles`
  - Audit Logs: `/admin/audit-logs`

## Role-Specific User Visible Behavior

### 1. Employee Dashboard
- **Summary Cards**: Displays Current Evaluation Status, Current Overall Score, Last Published Score, and Review Due Status.
- **Historical Score Trend**: Visualizes past cycle scores for the current employee only.
- **Review Due Widget**: Displays next evaluation due date, days remaining or overdue, and review cadence.
- **Criteria Breakdown**: Detailed table showing criterion code, category, weight, raw score, and weighted score.
- **Strengths & Development Areas**: Highlights highest and lowest scoring active criteria.
- **Action Required Items**: Warning banner directing the employee to submit self-assessment if active.

### 2. Manager Dashboard
- **Team Summary Cards**: Displays Team Members Count, Total Evaluations, Completed Count, Completion Rate (%), Team Average Score, and Overdue Reviews Count.
- **Workflow Distribution**: Breakdown across stages (`DRAFT`, `OPEN`, `SELF_ASSESSMENT`, `MANAGER_ASSESSMENT`, `REVIEWING`, `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`).
- **Team Score Distribution**: Histogram of evaluation scores grouped into discrete anonymous buckets (`0.0 - 1.0` through `4.0 - 5.0`).
- **Team Review Cadence Overview**: Breakdown of overdue, upcoming, and on-schedule team members.
- **Criterion Averages**: Average scores per criterion across managed team members.
- **Attention Items**: Direct action links to pending manager assessments and overdue reviews.

### 3. HR / Admin Dashboard
- **Organization Summary Cards**: Total Employees, Active Employees, Total Evaluations, Completion Rate (%), Organization Average Score, Overdue Reviews.
- **Workflow Bottlenecks**: Highlighting stages where evaluations are delayed (e.g. reviewing bottlenecks).
- **Organization Score Distribution**: Anonymous score range distribution with count and percentage share.
- **Department & Team Overview Table**: Team names, department names, member count, completed count, completion rate, and average score.
- **Organization Review Due Summary**: Overdue vs upcoming reviews across all departments.

### 4. System Admin Dashboard
- **Operational Summary**: Total Users, Configured Roles, Departments & Teams counts, Total Cycles, Published Templates.
- **System Health Widget**: Health indicators for Core Services, Database, and Reporting Read Models.
- **Operational Audit Summary**: Recent event counts by action and operational audit logs.

## Privacy & Anti-Ranking Guarantee
- The dashboard strictly prohibits individual stack-ranking, percentiles, leaderboards, or top/bottom employee rankings.
- All score distributions display aggregated bucket counts only.
- Manager and HR/Admin views display aggregate statistics only; individual evaluations cannot be compared side-by-side on the dashboard.

## Known Limitations
- Dashboard statistics reflect reporting read models; if a newly created evaluation has not yet been processed by the background projection worker, it will refresh upon subsequent cycle trigger or on-the-fly projection.
- Export functionality is handled through the dedicated backend-audited Reports export endpoints.
