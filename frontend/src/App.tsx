
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './app/query-client';
import { AuthProvider } from './shared/auth/AuthProvider';
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
import { EmployeeSearchPage } from './features/organization/pages/EmployeeSearchPage';
import { EmployeeKpiSummaryPage } from './features/evaluation/pages/EmployeeKpiSummaryPage';
import { I18nPage } from './features/i18n/pages/I18nPage';
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
import { ImportUploadPage } from './features/imports/pages/ImportUploadPage';
import { ImportHistoryPage } from './features/imports/pages/ImportHistoryPage';
import { ImportDetailPage } from './features/imports/pages/ImportDetailPage';
import { EvaluationDataImportPage } from './features/imports/pages/EvaluationDataImportPage';
import { CollectorPage } from './features/collector/pages/CollectorPage';
// Lazy-loaded: pulls in react-markdown/remark-gfm, kept out of the main bundle
const UserGuidePage = lazy(() =>
  import('./features/help/pages/UserGuidePage').then((m) => ({ default: m.UserGuidePage }))
);
import { EmployeeReportPage } from './features/reports/pages/EmployeeReportPage';
import { TeamReportPage } from './features/reports/pages/TeamReportPage';
import { OrganizationReportPage } from './features/reports/pages/OrganizationReportPage';
import { CalibrationPage } from './features/calibration/pages/CalibrationPage';
import { KpiSummaryDashboardPage } from './features/reports/employee-kpi-summary/pages/KpiSummaryDashboardPage';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, ThemeProvider, useTheme } from '@/shared/theme';
import { LayoutTemplate } from 'lucide-react';

import { useAuth } from './shared/auth/auth-context';
import { LogOut } from 'lucide-react';

const ADMIN_PAGE_TITLES: Record<string, string> = {
  iam: 'IAM Management',
  'audit-logs': 'Audit Logs',
  organization: 'Organization',
  employees: 'Employee Directory & Search',
  'employee-search': 'Employee Directory & Search',
  'kpi-summary': 'KPI Summary Dashboard',
  templates: 'Evaluation Templates',
  criteria: 'Criteria',
  i18n: 'Translation Settings',
  kpis: 'KPI Management',
  imports: 'CSV Imports',
  'evaluation-data-imports': 'KPI Data Imports',
  collectors: 'Auto Data Collection',
  cycles: 'Evaluation Cycles',
  calibration: 'Calibration Sessions & Adjustment',
  'my-evaluations': 'My Evaluations',
  'team-evaluations': 'Team Evaluations',
  'user-guide': 'User Guide',
  'my-report': 'Performance Report',
  'team-report': 'Team Dashboard',
  'org-report': 'Organization Dashboard',
};

function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();

  // Extract active menu from URL (e.g. /admin/iam -> iam, /admin/imports/upload -> imports, /reports/kpi-summary -> kpi-summary)
  const pathParts = location.pathname.split('/');
  const activeMenu = pathParts.includes('kpi-summary')
    ? 'kpi-summary'
    : pathParts.length > 2 ? pathParts[2] : 'iam';
  const pageTitle = ADMIN_PAGE_TITLES[activeMenu] ?? 'System Layout';

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {user && (
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
              transition: 'color 0.2s ease',
            }}
          >
            {user.name}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
              transition: 'color 0.2s ease',
            }}
          >
            {user.role}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={logout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
          border: `1px solid ${isDark ? '#374151' : COLORS.neutral[300]}`,
          borderRadius: RADII.md,
          cursor: 'pointer',
          color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
          fontSize: '0.875rem',
          fontWeight: 500,
          transition: 'all 0.15s ease',
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
      onSelectMenuItem={(id) => {
        if (id === 'imports') navigate('/admin/imports/upload');
        else if (id === 'employee-search') navigate('/admin/employees/search');
        else if (id === 'kpi-summary') navigate('/reports/kpi-summary');
        else navigate(`/admin/${id}`);
      }}
      pageTitle={pageTitle}
      headerActions={headerActions}
      onGenerateReport={() => alert('Generate Report clicked')}
      footerProps={{}}
    >
      <Outlet />
    </AppLayout>
  );
}

function SmartHomeRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'EMPLOYEE') return <Navigate to="/admin/my-evaluations" replace />;
  if (user?.role === 'MANAGER') return <Navigate to="/admin/team-evaluations" replace />;
  return <Navigate to="/admin/iam" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={
              <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                <ProtectedLayout />
              </ProtectedRoute>
            }>
              <Route path="/admin" element={<SmartHomeRedirect />} />
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
              <Route path="/admin/employees/search" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <EmployeeSearchPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/employees/:id/kpi-summary" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <EmployeeKpiSummaryPage />
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
              <Route path="/admin/i18n" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <I18nPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/kpis" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <KpiPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/imports" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <ImportHistoryPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/imports/upload" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <ImportUploadPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/imports/:id" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <ImportDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/evaluation-data-imports" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <EvaluationDataImportPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/collectors" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER']}>
                  <CollectorPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/cycles" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <EvaluationCycleListPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/calibration" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <CalibrationPage />
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
              <Route path="/admin/user-guide" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <Suspense fallback={null}>
                    <UserGuidePage />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/my-report" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <EmployeeReportPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/my-report/:employeeId" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <EmployeeReportPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/team-report" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER']}>
                  <TeamReportPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/team-report/:teamId" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER']}>
                  <TeamReportPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/org-report" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <OrganizationReportPage />
                </ProtectedRoute>
              } />
              <Route path="/reports/kpi-summary" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <KpiSummaryDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/reports/employees/:employeeId/kpi-summary" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <KpiSummaryDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/reports/kpi-summary" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <KpiSummaryDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/reports/employees/:employeeId/kpi-summary" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <KpiSummaryDashboardPage />
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

            <Route path="/" element={<SmartHomeRedirect />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

