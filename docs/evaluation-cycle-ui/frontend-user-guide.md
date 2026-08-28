# Evaluation Cycle Module — Frontend User Guide

## Prerequisites
- Node.js v18+ & pnpm / npm / yarn installed.
- Access role `SYSTEM_ADMIN` or `HR_ADMIN`.

## Startup Commands
```bash
cd frontend
npm run dev
```
Access the UI via browser at `http://localhost:5173/admin/cycles`.

## Configured Routes
- `/admin/cycles`: Evaluation Cycle Management List & Filters
- `/admin/cycles/new`: Create Evaluation Cycle Form
- `/admin/cycles/:id`: Evaluation Cycle Detail, Scope Preview & Actions
- `/admin/cycles/:id/edit`: Edit Draft Evaluation Cycle

## Expected Validation & Business Behavior
1. **Form Validation:**
   - `Cycle Code`, `Cycle Name`, `Template Version`, `Start Date`, and `End Date` are required fields.
   - `End Date` must strictly succeed `Start Date`.
2. **Mandatory vs Configurable Policies:**
   - Self Assessment is displayed as mandatory per system policy.
   - Calibration can be toggled on or off per cycle.
3. **Scope Preview & Snapshots:**
   - Detail view fetches scope preview displaying employee counts by team and job role.
   - Opening a cycle requires explicit modal confirmation and triggers immutable snapshot disclaimers.
4. **Locked State:**
   - When cycle status becomes `LOCKED`, all form controls and action buttons automatically enter read-only mode, and a global read-only notice banner is displayed.
