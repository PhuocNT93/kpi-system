# Frontend User Guide - Evaluation Cycle State Management

## 1. Prerequisites
- Node.js (v18+)
- Backend API server running on configured URL (default `http://localhost:3000` or via Vite proxy)
- User logged in as `HR_ADMIN` or `SYSTEM_ADMIN` to manage evaluation cycles

## 2. Startup Commands
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

## 3. URLs
- Evaluation Cycles List: `/admin/cycles`
- Create New Cycle: `/admin/cycles/new`
- Evaluation Cycle Detail & Transitions: `/admin/cycles/:id`
- Edit Draft Cycle: `/admin/cycles/:id/edit`

## 4. Lifecycle States & Allowed Actions
1. **DRAFT**: Allows `Edit Configuration`, `Open Cycle`.
2. **OPEN**: Evaluations created. Allows `Start In Progress` -> transitions to `IN_PROGRESS`, or `Lock Cycle` -> transitions to `LOCKED`.
3. **IN_PROGRESS**: Employees & managers filling assessments. Allows `Submit All Evaluations` -> transitions to `SUBMITTED`, or `Lock Cycle`.
4. **SUBMITTED**: Submissions complete. Allows `Start Reviewing` -> transitions to `REVIEWING`, or `Lock Cycle`.
5. **REVIEWING**: Reviews underway. Allows `Move to Calibration` -> transitions to `CALIBRATION`, `Approve Cycle` -> transitions to `APPROVED`, or `Lock Cycle`.
6. **CALIBRATION**: Calibration scoring underway. Allows `Approve Cycle` -> transitions to `APPROVED`, or `Lock Cycle`.
7. **APPROVED**: Cycle approved. Allows `Publish Results` -> transitions to `PUBLISHED`, or `Lock Cycle`.
8. **PUBLISHED**: Results visible to applicable employees. Allows `Lock Cycle` -> transitions to `LOCKED`.
9. **LOCKED**: Terminal state. Entire cycle and evaluations become permanently read-only.

## 5. Filtering & Search
- On `/admin/cycles`, select any of the 9 states from the **Status** dropdown to filter.
- Use the search bar to filter by cycle name or code.

## 6. Known Limitations
- State transitions are one-way and cannot be reverted once approved/locked.
- Only `HR_ADMIN` and `SYSTEM_ADMIN` have permissions to execute state transitions and lock cycles.
