# Frontend User Guide: Organization Structure Auto-Expansion & Data Sync

## 1. Prerequisites
- Node.js >= 20
- Running backend service: `npm run dev` in `backend` (default: `http://localhost:8080`)
- Running frontend Vite dev server: `npm run dev` in `frontend` (default: `http://localhost:5173`)

## 2. Startup & Shutdown Commands
- **Start Backend**: `cd backend && npm run dev`
- **Start Frontend**: `cd frontend && npm run dev`
- **Seed Real Members & Teams**: `cd backend && npm run seed`
- **Shutdown**: Press `Ctrl+C` in the respective terminal windows.

## 3. Configured URLs
- Local Frontend: `http://localhost:5173/admin/system-admin?tab=organization`
- Staging Frontend: `https://kpi-system-stagin.vercel.app/admin/system-admin?tab=organization`
- Backend API Base URL: `VITE_API_BASE_URL` (local: `http://localhost:8080`, develop/staging: `https://kpi-system-develop.onrender.com`)

## 4. User-Visible Behavior & Features
1. **Auto-Expanded Engineering Department**:
   - When visiting the **System & Security Hub > Organization** tab (`/admin/system-admin?tab=organization`), the **Engineering** (`DEPT-ENG`) department is automatically expanded in the left Organization Tree.
   - It works dynamically across environments regardless of the underlying PostgreSQL UUID for `DEPT-ENG`.
2. **Standardized Teams**:
   - Under **Engineering**, exactly 2 active teams are displayed:
     - `ALLEGRO NX` with badge `CT Riêng` (Custom Formula).
     - `Maritime Solutions` with badge `Mặc định` (Inherited Global Formula).
3. **Employees Placement**:
   - Selecting `Engineering` shows all 20 real members assigned to Engineering.
   - Selecting `ALLEGRO NX` shows 12 members (including Manager Lương Công Kỳ).
   - Selecting `Maritime Solutions` shows 8 members.
4. **Obsolete Departments Purged**:
   - The spurious `Solutions` department (`DEPT-6610`) has been cleaned up.

## 5. Known Limitations
- Modifying department hierarchy requires `SYSTEM_ADMIN` or `HR_ADMIN` role permissions.
