# Reporting Dashboard User Guide

The Reporting Dashboard provides detailed performance evaluation insights at the Employee, Team, and Organization levels, including trend analysis across cycles.

## 1. Accessing the Reports
- **My Report**: Log in as an Employee. Navigate to `Reports -> My Report`.
- **Team Report**: Log in as a Manager. Navigate to `Reports -> Team Report`.
- **Organization Report**: Log in as an HR or System Admin. Navigate to `Reports -> Organization Report`.

## 2. Reading the Dashboards

### Score Card
The **Score Card** displays the primary aggregate metric for the selected context:
- **Employee**: Shows Final Score vs Manager Score vs Self Score.
- **Team**: Shows Team Average Score and Completion Rate.
- **Organization**: Shows overall Organization Average Score and Departmental Completion Rates.

### KPI Breakdown
The **KPI Breakdown** lists individual KPIs.
- For individuals, it shows the Raw Score and Weighted Score for each KPI.
- For teams/organizations, it shows the average KPI Score and the number of employees evaluated under that KPI.

### Trend Analysis (Cross-Cycle Comparison)
The **Trend Analysis** table compares the current cycle's KPIs against the previous cycle.
- The system automatically matches KPIs between cycles using the underlying `kpi.code`.
- **Delta**: A positive delta (green) indicates improvement. A negative delta (red) indicates a decline.
- **New KPIs**: KPIs present in the current cycle but missing from the previous are marked as `NEW`.

## 3. Data Freshness
At the bottom of every dashboard, a **"Data as of: [Timestamp]"** indicator shows when the Read Models were last refreshed. The reporting data is generated from asynchronous projections and is highly optimized for read performance.

## 4. Permissions
Reports are heavily guarded by RBAC:
- You will only see the `Team Report` if you are the manager of that team.
- You will only see the `Organization Report` if you have HR or Admin privileges.
- Trying to access reports without correct permissions will show a generic "Permission Denied" UI state.
