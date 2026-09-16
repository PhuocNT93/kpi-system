# Frontend User Guide: Auto Collector Monthly Snapshot Caching

## 1. Overview
The Auto Collector interface (`/admin/collectors`) now incorporates **Monthly Snapshot Caching & Incremental Fetching**. When evaluating employees over 6-month or 1-year evaluation cycles, historical months are served instantly from PostgreSQL cache, reducing loading time from minutes down to ~1-2 seconds.

## 2. Prerequisites & Server URLs
- **Backend API URL**: `http://localhost:8080` (requires PostgreSQL running on port 5434).
- **Frontend URL**: `http://localhost:5173/admin/collectors`.
- **User Roles Allowed**: `SYSTEM_ADMIN`, `HR_ADMIN`, `MANAGER`.

## 3. Startup Commands
- Start Backend:
  ```bash
  cd backend
  npm run dev
  ```
- Start Frontend:
  ```bash
  cd frontend
  npm run dev
  ```

## 4. User-Visible Behavior & Features
1. **Instant Loading for Historical Months**:
   - When selecting a 6-month or 1-year evaluation cycle, months prior to the current calendar month are loaded from local database cache.
   - Only the active/current calendar month is queried live from Blueprint.
2. **Cache Acceleration Badge**:
   - Located in the top header bar next to "Người vận hành":
     `⚡ Tăng tốc bộ nhớ đệm (X tháng từ DB)`
   - Appears whenever cached historical data is utilized.
3. **Bypass Cache Control**:
   - A dedicated action button `Bỏ qua cache & Kéo lại từ Blueprint` is available next to the "Làm mới" button.
   - Clicking this button sends `forceRefresh: true`, instructing the server to bypass cache, pull fresh data for all months from Blueprint, and refresh the snapshot cache in PostgreSQL.
4. **Scoring Integrity**:
   - All punctuality and on-time task calculations are aggregated across all combined months and conform to corporate KPI rubrics.

## 5. Known Limitations
- Personal Blueprint attendance (UI_TAT_028) reflects individual monthly summaries.
- Team Attendance (UI_TAT_029) relies on manager credentials (`kyluong`).
