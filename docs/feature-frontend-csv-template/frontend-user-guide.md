# Frontend User Guide: CSV Template Management

## Prerequisites
- User must be logged in.
- User must hold the `HR_ADMIN` or `SYSTEM_ADMIN` role.

## Startup and Shutdown
- Start frontend: `npm run dev` in `frontend/`
- Start backend: `npm run dev` in `backend/`
- No additional background workers required for template downloading.

## Configured URLs
- **Page Route**: `http://localhost:5173/admin/import-center`
- **Backend API**: `http://localhost:3000/csv-templates/current/download`

## Available User-Visible Behavior
- **Sidebar Integration**: Click "Import Center" in the left sidebar to access the page.
- **Template Details Panel**: Displays the exact Code, Version, Status, and Effective Date of the currently active CSV import template.
- **Column Definition Table**: Explains every column required in the file.
- **KPI Code Optionality**: Explicitly tags `kpi_code` as "Optional" to clarify the scoring rules.
- **Validation Formats**: Translates complex database JSON validation rules into human-readable text (e.g., "Range: 0 - 100").
- **Download Action**: Clicking the download button automatically saves the raw `.csv` template directly to the computer for editing in Excel/Numbers.

## Expected Validation Behavior
- **Unauthorized**: Navigating to this route as an `EMPLOYEE` or `MANAGER` will result in a 403 API Error alert.
- **Network Failures**: If the backend is unreachable, the template panel stays hidden and a "Network Error" alert is displayed allowing for easy Retry.
- **Duplicate Downloads**: The download button actively disables itself and switches text to "Downloading..." to prevent multiple file downloads triggering simultaneously on slow connections.

## Known Limitations
- The current UI only displays the *active* version of the CSV template (`/current`). It does not list deprecated historical templates as the backend currently only exposes the active one for this MVP.
- CSV *Upload* flow is not yet attached to this page.
