# Frontend User Guide: Evaluation Template Builder

## Overview
The **Evaluation Template Builder** (within the Template & Criteria Configuration Module) is the corporate configuration workspace for HR Administrators to build, inspect, validate, preview, and publish evaluation templates.

## Prerequisites
- User must log in as an `HR_ADMIN` or `SYSTEM_ADMIN`.
- Node.js & npm installed locally for frontend execution.

## Commands
- Run frontend dev server: `npm run dev` (in `frontend/` directory).
- Execute unit tests: `npm test` (or `npx vitest run`).

## Navigation URL
- Template List: `http://localhost:5173/admin/templates`

## Key Capabilities & Workflows

### 1. Template List Dashboard
- Displays all evaluation templates with Name, Code, Version, Status badge (`Draft`, `Published`, `Archived`), Criteria Count, and Last Updated metadata.
- Contextual actions:
  - **Draft templates:** `Edit Draft` opens the Template Builder Workspace.
  - **Published templates:** Direct editing is disabled. Click `View` to inspect in read-only mode, or `Create New Version` to spawn a new editable draft (e.g. Version 2).

### 2. Template Builder Workspace
- **Header:** Shows Breadcrumbs, Template Name, Version Badge, Autosave status indicator, and primary CTAs (`Validate Template`, `Save Draft`, `Publish Version`).
- **Criterion Library (Left Panel):** Search criteria by name/code, filter by category (`Performance`, `Capability`, `Contribution`), hover preview metadata, and click `+ Add to Template`. Items already added show `✓ Already added`.
- **Selected Criteria Canvas (Center Panel):**
  - Reorder criteria via drag-and-drop handles (`⋮⋮`).
  - Direct weight percentage input (`%`).
  - Required / Optional toggle badge.
  - Applicability scope summary.
  - `⚙ Configure Rule & Scope` button opening the slide-over Drawer.

### 3. Real-time Weight Visual Feedback
- **Green (100% Configured · Valid):** Total active criteria weights equal exactly 100%. Ready to publish.
- **Amber (< 100% Configured):** Displays missing percentage remaining (e.g., `85% Configured · 15% remaining`).
- **Red (> 100% Configured):** Displays overage percentage (e.g., `108% Configured · 8% over limit`).

### 4. Configuration Provenance Popover
- Click `Source: ... ℹ` on any criterion card to inspect the 4-tier precedence resolution hierarchy:
  `Global` → `Role` → `Team` → `Template` (Template override is highest authority and highlighted in blue).

### 5. Slide-over Criterion Configuration Drawer
- **General:** Edit effective weight, select Required vs Optional requirement mode, and view measurement metadata (Unit, Source Label).
- **Applicability:** Interactive matrix to pick specific Roles (e.g., Software Engineer) and Teams. Displays human-readable scope semantics (e.g. `Applies to employees matching: Role: SI AND Team: Team A`).
- **Scoring Rules:** Dynamic forms for 5 rule types:
  - `RANGE_THRESHOLD`: Min/Max percentage ranges with inline overlap warnings.
  - `INVERSE_THRESHOLD`: Days/Thresholds where lower metric values yield higher ratings.
  - `COUNT_THRESHOLD`: Integer frequency buckets (e.g. completed tasks).
  - `ORDINAL_MANUAL`: Qualitative level descriptions.
  - `ROLE_CONDITIONAL`: Role-specific rule branching.
- **Levels Editor:** Add/remove evaluation levels, edit level titles and score values.

### 6. Validation Diagnostics & Publish Flow
- Click `Validate Template` to trigger backend/client-side rule verification.
- Grouped error diagnostics report blocking errors (e.g. total weight ≠ 100%, range overlaps, missing role branches) with `Jump to Field` links.
- Click `Publish Version` to open the confirmation modal outlining immutability rules. Once published, the version becomes read-only and immutable.

### 7. Version Governance & Optimistic Locking
- **Version Diff Comparison:** View side-by-side diffs between Published V1 and Draft V2 highlighting added/removed criteria and weight shifts.
- **Optimistic Concurrency (409 Conflict):** If another HR Admin saves edits concurrently, an alert modal notifies the user and provides a `Reload Latest Version` action.
