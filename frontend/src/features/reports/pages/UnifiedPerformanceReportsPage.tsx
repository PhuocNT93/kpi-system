import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import {
  User,
  Users,
  Building2,
  BarChart3,
  Sparkles,
} from 'lucide-react';

import { EmployeeReportPage } from '@/features/reports/pages/EmployeeReportPage';
import { TeamReportPage } from '@/features/reports/pages/TeamReportPage';
import { OrganizationReportPage } from '@/features/reports/pages/OrganizationReportPage';
import { KpiSummaryDashboardPage } from '@/features/reports/employee-kpi-summary/pages/KpiSummaryDashboardPage';

export type ReportScopeId = 'my' | 'team' | 'org' | 'summary';

interface ReportScopeConfig {
  id: ReportScopeId;
  labelKey: string;
  defaultLabel: string;
  badgeKey: string;
  defaultBadge: string;
  badgeColor: string;
  badgeBg: string;
  badgeBgDark: string;
  descriptionKey: string;
  defaultDescription: string;
  icon: React.ReactNode;
  allowedRoles: Array<'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE'>;
}

const REPORT_SCOPES: ReportScopeConfig[] = [
  {
    id: 'my',
    labelKey: 'reports.scope.my',
    defaultLabel: '1. Báo cáo của tôi',
    badgeKey: 'reports.badge.personal',
    defaultBadge: 'Cá nhân',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBgDark: 'rgba(37, 99, 235, 0.2)',
    descriptionKey: 'reports.desc.my',
    defaultDescription: 'Chi tiết điểm số, radar năng lực và lịch sử đánh giá cá nhân qua các kỳ',
    icon: <User size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    id: 'team',
    labelKey: 'reports.scope.team',
    defaultLabel: '2. Báo cáo Đội nhóm',
    badgeKey: 'reports.badge.team',
    defaultBadge: 'Team & Phòng ban',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBgDark: 'rgba(5, 150, 105, 0.2)',
    descriptionKey: 'reports.desc.team',
    defaultDescription: 'Xếp hạng, phân phối điểm trung bình và tiến độ đánh giá của các thành viên trong nhóm',
    icon: <Users size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER'],
  },
  {
    id: 'org',
    labelKey: 'reports.scope.org',
    defaultLabel: '3. Báo cáo Toàn công ty',
    badgeKey: 'reports.badge.org',
    defaultBadge: 'Toàn tổ chức',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    badgeBgDark: 'rgba(124, 58, 237, 0.2)',
    descriptionKey: 'reports.desc.org',
    defaultDescription: 'Bức tranh tổng thể về hiệu suất giữa các bộ phận, tỷ lệ hoàn thành KPI toàn doanh nghiệp',
    icon: <Building2 size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'summary',
    labelKey: 'reports.scope.summary',
    defaultLabel: '4. Bảng tổng hợp KPI',
    badgeKey: 'reports.badge.summary',
    defaultBadge: 'Dashboard Thống kê',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
    badgeBgDark: 'rgba(217, 119, 6, 0.2)',
    descriptionKey: 'reports.desc.summary',
    defaultDescription: 'Ma trận thống kê phân bổ hạng S, A, B, C, D và phân tích biến động chỉ số cốt lõi',
    icon: <BarChart3 size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
];

export const UnifiedPerformanceReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || 'EMPLOYEE') as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

  // Filter available scopes based on user role
  const availableScopes = useMemo(() => {
    return REPORT_SCOPES.filter((scope) => scope.allowedRoles.includes(userRole));
  }, [userRole]);

  // Read active scope from URL query param `?scope=...`
  const rawScope = (searchParams.get('scope') || '').toLowerCase() as ReportScopeId;
  const activeScope: ReportScopeId = useMemo(() => {
    if (availableScopes.some((s) => s.id === rawScope)) {
      return rawScope;
    }
    return availableScopes[0]?.id || 'my';
  }, [availableScopes, rawScope]);

  const handleScopeChange = (scopeId: ReportScopeId) => {
    setSearchParams({ scope: scopeId });
  };

  const activeScopeConfig = availableScopes.find((s) => s.id === activeScope);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', padding: '0 0 40px 0' }}>
      {/* Top Banner & Scope Switcher Hub */}
      <div
        style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderRadius: RADII.xl,
          border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
          boxShadow: SHADOWS.sm,
          padding: '24px 28px 20px 28px',
          marginBottom: '24px',
        }}
      >
        {/* Hub Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: RADII.lg,
                  backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#f5f3ff',
                  color: isDark ? '#c4b5fd' : '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    fontWeight: 800,
                    color: isDark ? '#f8fafc' : '#0f172a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {t('reports.title', 'Trung Tâm Báo Cáo Hiệu Suất (Performance Reports)')}
                </h1>
                <p
                  style={{
                    margin: '3px 0 0 0',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    color: isDark ? '#94a3b8' : '#64748b',
                  }}
                >
                  {t('reports.subtitle', 'Theo dõi kết quả đánh giá, phân tích xu hướng điểm số và xuất báo cáo đa chiều theo phạm vi')}
                </p>
              </div>
            </div>
          </div>

          {/* User Role Tag */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: RADII.full,
              backgroundColor: isDark ? '#1f2937' : '#f8fafc',
              border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
              color: isDark ? '#e2e8f0' : '#334155',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 700,
            }}
          >
            <span>{t('reports.role_scope', 'Phạm vi tài khoản')}: {userRole}</span>
          </div>
        </div>

        {/* Scope Selection Bar */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            borderBottom: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
            paddingBottom: '2px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {availableScopes.map((scope) => {
            const isActive = activeScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => handleScopeChange(scope.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: `${RADII.lg} ${RADII.lg} 0 0`,
                  border: 'none',
                  borderBottom: isActive ? `3px solid ${isDark ? '#a78bfa' : '#7c3aed'}` : '3px solid transparent',
                  backgroundColor: isActive ? (isDark ? '#1e293b' : '#f8fafc') : 'transparent',
                  color: isActive ? (isDark ? '#c4b5fd' : '#5b21b6') : (isDark ? '#94a3b8' : '#64748b'),
                  cursor: 'pointer',
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: isActive ? (isDark ? '#a78bfa' : '#7c3aed') : (isDark ? '#64748b' : '#94a3b8') }}>
                  {scope.icon}
                </span>
                <span>{t(scope.labelKey, scope.defaultLabel)}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: RADII.full,
                    backgroundColor: isDark ? scope.badgeBgDark : scope.badgeBg,
                    color: isDark ? '#ffffff' : scope.badgeColor,
                  }}
                >
                  {t(scope.badgeKey, scope.defaultBadge)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Scope Description Notice */}
        {activeScopeConfig && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '12px',
              fontSize: TYPOGRAPHY.fontSize.xs,
              color: isDark ? '#94a3b8' : '#64748b',
            }}
          >
            <span>💡 {t(activeScopeConfig.descriptionKey, activeScopeConfig.defaultDescription)}</span>
          </div>
        )}
      </div>

      {/* Scope Content Display Area */}
      <div>
        {activeScope === 'my' && <EmployeeReportPage />}
        {activeScope === 'team' && <TeamReportPage />}
        {activeScope === 'org' && <OrganizationReportPage />}
        {activeScope === 'summary' && <KpiSummaryDashboardPage />}
      </div>
    </div>
  );
};
