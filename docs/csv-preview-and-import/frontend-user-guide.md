# Frontend User Guide: CSV Preview & Import

## Overview
The CSV Import feature allows HR Admins to bulk upload employee criterion scores for a specific evaluation cycle. The new interface provides validation feedback before committing data to the database, offering both partial and strict processing options.

## Configured Routes
- **UI Route**: `/imports`
- **Component**: `ImportCenterPage.tsx`
- **Backend API Endpoints**:
  - `POST /api/imports/csv`: Validate and upload the CSV
  - `POST /api/imports/:id/confirm`: Execute the import (synchronous or background)
  - `GET /api/imports/:id`: Poll background import status

## Prerequisites
- A valid access token with `HR_ADMIN` or `SYSTEM_ADMIN` role.
- An active Evaluation Cycle.
- Employee CSV template downloaded from `/api/csv-templates/current/download`.

## Usage Instructions

1. **Upload CSV:** Select the correct Evaluation Cycle and choose the filled CSV file. Click "Upload CSV".
2. **Review Validation Preview:**
   - **Total Rows**: Total entries in the CSV.
   - **Valid Rows**: Entries that match the system rules (valid employee, valid structure).
   - **Errors**: Rows with formatting or rule violations.
   - You can review exactly which row failed via the paginated error table provided below the counters.
3. **Select Import Mode:**
   - **Partial Import (Recommended)**: Imports the valid rows and safely ignores the ones with errors.
   - **Strict Mode**: Commits to all-or-nothing logic. If there are validation errors, it will refuse to start the process.
4. **Confirm and Import:**
   - Click "Confirm and Import".
   - If the file has fewer than 500 rows, it will complete synchronously.
   - If the file has more than 500 rows, it will process in the background. The UI will automatically poll the backend (every 2 seconds) until the status resolves to `COMPLETED`, `PARTIALLY_COMPLETED`, or `FAILED`.
5. **Post-Import:**
   - Once completed, you can click "Start New Import" to reset the state.

## Known Limitations
- The error preview table is capped at the first 100 errors for browser performance.
- Background polling might remain in the `IMPORTING` state longer for extremely large datasets (>10,000 rows). Do not refresh the page during this state.
