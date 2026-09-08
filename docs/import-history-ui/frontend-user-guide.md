# CSV Imports - Frontend User Guide

## Prerequisites
- Node.js & npm (for frontend and backend)
- PostgreSQL database
- Seeded test data (including evaluation cycles and active templates)

## Startup Commands
- Start the frontend: `npm run dev` in `kpi-system/frontend/`
- Start the backend: `npm run start:dev` in `kpi-system/backend/`

## Configured URLs
- History Page: `http://localhost:5173/admin/imports`
- Upload Page: `http://localhost:5173/admin/imports/upload`
- Detail Page: `http://localhost:5173/admin/imports/:id`

## Expected Behavior
1. **History List**: By visiting `/admin/imports`, HR/Admin users see a paginated list of all imports. Any currently running jobs will be updated automatically via background polling.
2. **Uploading**: By clicking `Upload CSV` or visiting `/admin/imports/upload`, the user selects an evaluation cycle and a `.csv` file. 
3. **Validation**: After uploading, the backend parses the CSV against the active evaluation template and displays a validation preview. Invalid rows present an error code and message.
4. **Import Mode Selection**:
   - **Partial Import**: Imports only valid rows and skips rows with errors.
   - **Strict Import**: Demands a perfect file. If there are any row validation errors, it warns the user and rejects confirmation.
5. **Progress Polling**: After confirming, the user sees an `IMPORTING` state. The UI periodically polls the backend to report live progress.
6. **Detailed View**: Clicking on an import job from the History list opens the detail page, showing overall metadata and paginated row-by-row status and error messages.

## Known Limitations
- The system defaults to standard pagination with manual "Next/Previous" buttons.
- For extremely large files (e.g., > 10,000 rows), navigating through row errors via pagination is supported, but searching specific errors relies on standard database offset pagination without client-side text filtering yet.
- Only CSV files are supported. Excel `.xlsx` files must be exported to CSV before upload.
