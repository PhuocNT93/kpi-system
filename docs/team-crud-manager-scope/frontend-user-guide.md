# Frontend User Guide: Organization Teams

## Overview
The Team Management module provides a UI to view, create, update, and deactivate teams within the organization.

## Prerequisites
- The frontend must be running (`npm run dev` in the `frontend` directory).
- The backend API must be accessible.
- Users must be authenticated.

## Available User-Visible Behavior

### 1. Viewing Teams
- Navigate to `/admin/organization/teams` from the sidebar.
- All users (including `EMPLOYEE` and `MANAGER`) can view the Teams list.
- **Note on Scope:** Managers will only see the teams assigned to them. HR and System Admins see all teams.
- The table displays the Team Code, Name, and Status.

### 2. Creating Teams
- **Access:** Only `HR_ADMIN` and `SYSTEM_ADMIN` roles can see the "+ Create Team" button.
- Clicking the button opens a modal.
- You must provide a valid `Team Code` (up to 20 chars), `Team Name` (up to 100 chars), and select a `Department`.
- Codes are unique; duplicate codes will trigger a validation error.

### 3. Editing Teams
- **Access:** Only `HR_ADMIN` and `SYSTEM_ADMIN`.
- Clicking "Edit" in the table opens the modal in edit mode.
- The `Team Code` is immutable and cannot be changed after creation.
- You can update the `Team Name`, `Department`, and `Description`.

### 4. Deactivating Teams
- **Access:** Only `HR_ADMIN` and `SYSTEM_ADMIN`.
- Clicking "Deactivate" opens a confirmation dialog.
- The system checks if the team has any active employees. If it does, deactivation is blocked and a warning is displayed.

## Known Limitations
- Team reactivation is not supported through the UI yet (requires backend intervention or a future feature).
- Bulk actions (e.g., deactivating multiple teams at once) are not implemented.
