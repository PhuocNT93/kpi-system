
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './app/query-client';
import { AuthProvider } from './shared/auth/AuthProvider';
import { ProtectedRoute } from './shared/auth/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { UnifiedSystemAdminPage } from './features/organization/pages/UnifiedSystemAdminPage';
import { UnifiedEvaluationsHubPage } from './features/evaluation/pages/UnifiedEvaluationsHubPage';
import { EmployeeKpiSummaryPage } from './features/evaluation/pages/EmployeeKpiSummaryPage';
import { EvaluationDetailPage } from './features/evaluation/pages/EvaluationDetailPage';
import { TeamEvaluationDetailPage } from './features/evaluation/pages/TeamEvaluationDetailPage';
import {
  UnifiedEvaluationCyclesPage,
  EvaluationCycleCreatePage,
  EvaluationCycleDetailPage,
  EvaluationCycleEditPage,
} from './features/evaluation-cycles';
import { UnifiedKpiTemplateStudioPage } from './features/templates';
import { AppLayout } from '@/shared/layout';
import { ImportDetailPage } from './features/imports/pages/ImportDetailPage';
import { DataIngestionHubPage } from './features/imports/pages/DataIngestionHubPage';
// Lazy-loaded: pulls in react-markdown/remark-gfm, kept out of the main bundle
const UserGuidePage = lazy(() =>
  import('./features/help/pages/UserGuidePage').then((m) => ({ default: m.UserGuidePage }))
);
import { EmployeeReportPage } from './features/reports/pages/EmployeeReportPage';
import { TeamReportPage } from './features/reports/pages/TeamReportPage';
import { KpiSummaryDashboardPage } from './features/reports/employee-kpi-summary/pages/KpiSummaryDashboardPage';
import { UnifiedPerformanceReportsPage } from './features/reports/pages/UnifiedPerformanceReportsPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import {
  UnifiedNotificationsPage,
} from './features/notifications';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, ThemeProvider, useTheme } from '@/shared/theme';
import { LayoutTemplate } from 'lucide-react';

import { useAuth } from './shared/auth/auth-context';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { LogOut } from 'lucide-react';

const PAGE_SECTIONS: Record<string, [string, string]> = {
  notifications: ['nav.overview', 'Overview'],
  evaluations: ['nav.performance', 'Performance'],
  reports: ['nav.reporting', 'Reporting'],
  cycles: ['nav.configuration', 'Configuration'],
  templates: ['nav.configuration', 'Configuration'],
  'system-admin': ['nav.configuration', 'Configuration'],
};

const ADMIN_PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  'system-admin': 'System & Security Hub',
  iam: 'IAM Management',
  'audit-logs': 'Audit Logs',
  organization: 'Organization',
  employees: 'Employee Directory & Search',
  'employee-search': 'Employee Directory & Search',
  'kpi-summary': 'Performance Reports',
  reports: 'Performance Reports',
  ingestion: 'KPI Data Ingestion Hub',
  templates: 'KPI & Templates Studio',
  criteria: 'Criteria',
  i18n: 'Translation Settings',
  kpis: 'KPI Management',
  imports: 'KPI Data Ingestion Hub',
  'evaluation-data-imports': 'KPI Data Ingestion Hub',
  collectors: 'KPI Data Ingestion Hub',
  cycles: 'Evaluation Cycles Hub',
  'review-due': 'Review Due Dashboard',
  'review-cadences': 'Review Cadence Management',
  'individual-cycles': 'Individual Evaluation',
  calibration: 'Calibration Sessions & Adjustment',
  evaluations: 'Evaluations Hub',
  'my-evaluations': 'My Evaluations',
  'team-evaluations': 'Team Evaluations',
  'user-guide': 'User Guide',
  notifications: 'Notifications & Email Hub',
  'notification-preferences': 'Notification Preferences',
  'notification-templates': 'Email Templates',
  'notification-logs': 'Email Delivery Logs',
  'my-report': 'Performance Reports',
  'team-report': 'Performance Reports',
  'org-report': 'Performance Reports',
};

function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  // Extract active menu from URL
  const pathParts = location.pathname.split('/');
  const activeMenu = pathParts.includes('dashboard')
    ? 'dashboard'
    : pathParts.includes('reports') || pathParts.includes('kpi-summary') || pathParts.includes('my-report') || pathParts.includes('team-report') || pathParts.includes('org-report')
    ? 'reports'
    : pathParts.includes('ingestion') || pathParts.includes('collectors') || pathParts.includes('imports') || pathParts.includes('evaluation-data-imports')
    ? 'ingestion'
    : pathParts.includes('notifications') || pathParts.includes('notification-preferences') || pathParts.includes('notification-templates') || pathParts.includes('notification-logs')
    ? 'notifications'
    : pathParts.includes('evaluations') || pathParts.includes('my-evaluations') || pathParts.includes('team-evaluations') || pathParts.includes('employee-search')
    ? 'evaluations'
    : pathParts.includes('cycles') || pathParts.includes('individual-cycles') || pathParts.includes('review-due') || pathParts.includes('review-cadences') || pathParts.includes('calibration')
    ? 'cycles'
    : pathParts.includes('templates') || pathParts.includes('kpis') || pathParts.includes('criteria')
    ? 'templates'
    : pathParts.includes('system-admin') || pathParts.includes('organization') || pathParts.includes('iam') || pathParts.includes('audit-logs') || pathParts.includes('i18n')
    ? 'system-admin'
    : pathParts.length > 2 ? pathParts[2] : 'dashboard';
  const defaultPageTitle = ADMIN_PAGE_TITLES[activeMenu] ?? 'System Layout';
  const pageTitle = t(`title.${activeMenu.replace(/-/g, '_')}`, defaultPageTitle);
  // Sidebar section of each hub, shown as the first breadcrumb step in the header.
  const sectionEntry = PAGE_SECTIONS[activeMenu];
  const pageSection = sectionEntry ? t(sectionEntry[0], sectionEntry[1]) : undefined;

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {user && (
        <div style={{ textAlign: 'right' }} className="hide-on-mobile">
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
        title={t('common.logout', 'Log out')}
        aria-label={t('common.logout', 'Log out')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
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
        <span className="hide-on-mobile">{t('common.logout', 'Log out')}</span>
      </button>
    </div>
  );

  return (
    <AppLayout
      activeMenuItem={activeMenu}
      onSelectMenuItem={(id) => {
        if (id === 'dashboard') navigate('/admin/dashboard');
        else if (id === 'ingestion') navigate('/admin/ingestion');
        else if (id === 'jira-eval') navigate('/admin/ingestion?tab=jira');
        else if (id === 'reports') navigate('/admin/reports');
        else if (id === 'notifications') navigate('/admin/notifications');
        else if (id === 'evaluations') navigate('/admin/evaluations');
        else if (id === 'cycles') navigate('/admin/cycles');
        else if (id === 'templates') navigate('/admin/templates');
        else if (id === 'system-admin') navigate('/admin/system-admin');
        else if (id === 'imports') navigate('/admin/ingestion?tab=csv');
        else if (id === 'collectors') navigate('/admin/ingestion?tab=jira');
        else if (id === 'employee-search') navigate('/admin/evaluations?tab=search');
        else if (id === 'kpi-summary') navigate('/admin/reports?scope=summary');
        else navigate(`/admin/${id}`);
      }}
      pageTitle={pageTitle}
      pageSection={pageSection}
      headerActions={headerActions}
      onGenerateReport={() => alert('Generate Report clicked')}
      footerProps={{}}
    >
      <Outlet />
    </AppLayout>
  );
}

function SmartHomeRedirect() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/admin/dashboard" replace />;
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
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              {/* System & Security Unified Hub & Redirects */}
              <Route path="/admin/system-admin" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <UnifiedSystemAdminPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/organization" element={<Navigate to="/admin/system-admin?tab=organization" replace />} />
              <Route path="/admin/iam/*" element={<Navigate to="/admin/system-admin?tab=iam" replace />} />
              <Route path="/admin/iam" element={<Navigate to="/admin/system-admin?tab=iam" replace />} />
              <Route path="/admin/audit-logs" element={<Navigate to="/admin/system-admin?tab=audit" replace />} />
              <Route path="/admin/i18n" element={<Navigate to="/admin/system-admin?tab=i18n" replace />} />

              {/* Evaluations Unified Hub & Redirects */}
              <Route path="/admin/evaluations" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <UnifiedEvaluationsHubPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/my-evaluations" element={<Navigate to="/admin/evaluations?tab=my" replace />} />
              <Route path="/admin/team-evaluations" element={<Navigate to="/admin/evaluations?tab=team" replace />} />
              <Route path="/admin/employees/search" element={<Navigate to="/admin/evaluations?tab=search" replace />} />
              <Route path="/admin/employees/:id/kpi-summary" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <EmployeeKpiSummaryPage />
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

              {/* KPI & Templates Studio Hub & Redirects */}
              <Route path="/admin/templates" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <UnifiedKpiTemplateStudioPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/criteria" element={<Navigate to="/admin/templates?tab=criteria" replace />} />
              <Route path="/admin/kpis" element={<Navigate to="/admin/templates?tab=kpis" replace />} />

              {/* Evaluation Cycles Unified Hub & Redirects */}
              <Route path="/admin/cycles" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER']}>
                  <UnifiedEvaluationCyclesPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/individual-cycles" element={<Navigate to="/admin/cycles?tab=individual" replace />} />
              <Route path="/admin/review-due" element={<Navigate to="/admin/cycles?tab=review-due" replace />} />
              <Route path="/admin/cycles/review-due" element={<Navigate to="/admin/cycles?tab=review-due" replace />} />
              <Route path="/admin/review-cadences" element={<Navigate to="/admin/cycles?tab=cadences" replace />} />
              <Route path="/admin/calibration" element={<Navigate to="/admin/cycles?tab=calibration" replace />} />
              <Route path="/admin/cycles/new" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <EvaluationCycleCreatePage />
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
              {/* Data Ingestion Hub & Redirects */}
              <Route path="/admin/ingestion" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER']}>
                  <DataIngestionHubPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/imports/:id" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                  <ImportDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/collectors" element={<Navigate to="/admin/ingestion?tab=jira" replace />} />
              <Route path="/admin/jira-collector" element={<Navigate to="/admin/ingestion?tab=jira" replace />} />
              <Route path="/admin/jira-eval" element={<Navigate to="/admin/ingestion?tab=jira" replace />} />
              <Route path="/jira-collector" element={<Navigate to="/admin/ingestion?tab=jira" replace />} />
              <Route path="/admin/imports" element={<Navigate to="/admin/ingestion?tab=history" replace />} />
              <Route path="/admin/imports/upload" element={<Navigate to="/admin/ingestion?tab=csv" replace />} />
              <Route path="/admin/evaluation-data-imports" element={<Navigate to="/admin/ingestion?tab=api" replace />} />

              <Route path="/admin/user-guide" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <Suspense fallback={null}>
                    <UserGuidePage />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <UnifiedPerformanceReportsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/my-report" element={<Navigate to="/admin/reports?scope=my" replace />} />
              <Route path="/admin/my-report/:employeeId" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <EmployeeReportPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/team-report" element={<Navigate to="/admin/reports?scope=team" replace />} />
              <Route path="/admin/team-report/:teamId" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER']}>
                  <TeamReportPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/org-report" element={<Navigate to="/admin/reports?scope=org" replace />} />
              <Route path="/reports/kpi-summary" element={<Navigate to="/admin/reports?scope=summary" replace />} />
              <Route path="/reports/employees/:employeeId/kpi-summary" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <KpiSummaryDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/reports/kpi-summary" element={<Navigate to="/admin/reports?scope=summary" replace />} />
              <Route path="/admin/reports/employees/:employeeId/kpi-summary" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <KpiSummaryDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/notifications" element={
                <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']}>
                  <UnifiedNotificationsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/notification-preferences" element={<Navigate to="/admin/notifications?tab=preferences" replace />} />
              <Route path="/admin/notification-templates" element={<Navigate to="/admin/notifications?tab=templates" replace />} />
              <Route path="/admin/notification-logs" element={<Navigate to="/admin/notifications?tab=logs" replace />} />
              <Route path="/notifications/preferences" element={<Navigate to="/admin/notifications?tab=preferences" replace />} />
              <Route path="/notifications" element={<Navigate to="/admin/notifications" replace />} />
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
            <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />

          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

