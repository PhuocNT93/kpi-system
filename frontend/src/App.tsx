
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
import { EvaluationTemplatesPage } from './features/templates/pages/EvaluationTemplatesPage';
import { CriteriaPage } from './features/criteria/pages/CriteriaPage';
import { OrganizationPage } from './features/organization/pages/OrganizationPage';
import { EvaluationDetailPage } from './features/evaluation/pages/EvaluationDetailPage';
import { TeamEvaluationDetailPage } from './features/evaluation/pages/TeamEvaluationDetailPage';
import { MyEvaluationPage } from './features/evaluation/pages/MyEvaluationPage';
import { TeamEvaluationsPage } from './features/evaluation/pages/TeamEvaluationsPage';
import {
  EvaluationCycleListPage,
  EvaluationCycleCreatePage,
  EvaluationCycleDetailPage,
  EvaluationCycleEditPage,
} from './features/evaluation-cycles';
import { AppLayout } from '@/shared/layout';
import { KpiPage } from './features/kpi/pages/KpiPage';
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
              } />
              <Route path="/admin/templates" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <EvaluationTemplatesPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/criteria" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <CriteriaPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/kpis" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <KpiPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/cycles" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <EvaluationCycleListPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/cycles/new" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <EvaluationCycleCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/admin/my-evaluations" element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'SYSTEM_ADMIN']}>
                  <MyEvaluationPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/my-evaluations/:id" element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'SYSTEM_ADMIN']}>
                  <EvaluationDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/team-evaluations/:id" element={
                <ProtectedRoute allowedRoles={['MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN']}>
                  <TeamEvaluationDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/team-evaluations" element={
                <ProtectedRoute allowedRoles={['MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN']}>
                  <TeamEvaluationsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/cycles/:id" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <EvaluationCycleDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/cycles/:id/edit" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <EvaluationCycleEditPage />
                </ProtectedRoute>
              } />
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
