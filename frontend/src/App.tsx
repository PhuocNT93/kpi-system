
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './app/query-client';
import { AuthProvider } from './shared/auth/AuthContext';
import { ProtectedRoute } from './shared/auth/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import {
  IamPage,
  UsersPage,
  RolesPage,
  PermissionsPage,
} from './features/iam/pages/IamPage';
import { AuditLogPage } from './features/audit/pages/AuditLogPage';
import { TeamsPage } from './features/organization/pages/TeamsPage';
import { OrganizationPage } from './features/organization/pages/OrganizationPage';
import { DepartmentsPage } from './features/organization/pages/DepartmentsPage';
import { OrgRolesPage } from './features/organization/pages/OrgRolesPage';
import { JobLevelsPage } from './features/organization/pages/JobLevelsPage';
import { EmployeesPage } from './features/organization/pages/EmployeesPage';
import { AppLayout } from '@/shared/layout';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { LayoutTemplate } from 'lucide-react';

import { useAuth } from './shared/auth/AuthContext';
import { LogOut } from 'lucide-react';

function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Extract active menu from URL (e.g. /admin/iam -> iam)
  const pathParts = location.pathname.split('/');
  const activeMenu = pathParts.length > 2 ? pathParts[2] : 'iam';

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {user && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: COLORS.neutral.textPrimary }}>
            {user.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: COLORS.neutral.textSecondary }}>
            {user.role}
          </div>
        </div>
      )}
      <button
        onClick={logout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'transparent',
          border: `1px solid ${COLORS.neutral[300]}`,
          borderRadius: RADII.md,
          cursor: 'pointer',
          color: COLORS.neutral.textPrimary,
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        <LogOut size={16} />
        Log out
      </button>
    </div>
  );

  return (
    <AppLayout
      activeMenuItem={activeMenu}
      onSelectMenuItem={(id) => navigate(`/admin/${id}`)}
      pageTitle="System Layout"
      headerActions={headerActions}
      onGenerateReport={() => alert('Generate Report clicked')}
      footerProps={{}}
    >
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={
              <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                <ProtectedLayout />
              </ProtectedRoute>
            }>
              <Route path="/admin/iam" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <IamPage />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="users" replace />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="permissions" element={<PermissionsPage />} />
              </Route>

              <Route path="/admin/audit-logs" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <AuditLogPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/organization" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <OrganizationPage />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="departments" replace />} />
                <Route path="departments" element={<DepartmentsPage />} />
                <Route path="teams" element={<TeamsPage />} />
                <Route path="roles" element={<OrgRolesPage />} />
                <Route path="levels" element={<JobLevelsPage />} />
                <Route path="employees" element={<EmployeesPage />} />
              </Route>
              <Route path="/draft" element={
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: COLORS.neutral.white,
                    borderRadius: RADII['2xl'],
                    border: `1.5px dashed ${COLORS.primary[200]}`,
                    padding: '48px 24px',
                    boxSizing: 'border-box',
                    gap: '16px'
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: RADII.xl, backgroundColor: COLORS.primary[50], display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary.DEFAULT }}>
                    <LayoutTemplate size={24} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 8px 0', fontFamily: TYPOGRAPHY.fontFamily.headline, fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                      Main Content Slot (Draft Ready)
                    </h2>
                    <p style={{ margin: 0, fontFamily: TYPOGRAPHY.fontFamily.body, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, maxWidth: '480px', lineHeight: TYPOGRAPHY.lineHeight.relaxed }}>
                      Khung layout (Sidebar Menu Tree, Header, Bottom Action Bar) đã sẵn sàng.
                    </p>
                  </div>
                </div>
              } />
            </Route>

            <Route path="/" element={<Navigate to="/admin/iam" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
