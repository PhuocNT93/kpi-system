import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { humanizeRoleCode, roleLabelKey } from '@/shared/auth/role-label';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { User, Users, Building2, BarChart3, Sparkles } from 'lucide-react';

import { EmployeeReportPage } from '@/features/reports/pages/EmployeeReportPage';
import { TeamReportPage } from '@/features/reports/pages/TeamReportPage';
import { OrganizationReportPage } from '@/features/reports/pages/OrganizationReportPage';
import { KpiSummaryDashboardPage } from '@/features/reports/employee-kpi-summary/pages/KpiSummaryDashboardPage';
import { useHubTabTooltip } from '@/shared/ui/HubTabTooltip/use-hub-tab-tooltip';
import { useHeaderTrail } from '@/shared/layout/header-trail';

export type ReportScopeId = 'my' | 'team' | 'org' | 'summary';
type ReportRole = 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

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
  allowedRoles: ReportRole[];
}

const REPORT_SCOPES: ReportScopeConfig[] = [
  {
    id: 'my',
    labelKey: 'reports.scope.my',
    defaultLabel: 'Báo cáo của tôi',
    badgeKey: 'reports.badge.personal',
    defaultBadge: 'Personal',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBgDark: 'rgba(37, 99, 235, 0.2)',
    descriptionKey: 'reports.desc.my',
    defaultDescription: 'Detailed scores, competency radar, and personal evaluation history across cycles',
    icon: <User size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    id: 'team',
    labelKey: 'reports.scope.team',
    defaultLabel: 'Báo cáo Đội nhóm',
    badgeKey: 'reports.badge.team',
    defaultBadge: 'Team & Department',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBgDark: 'rgba(5, 150, 105, 0.2)',
    descriptionKey: 'reports.desc.team',
    defaultDescription: 'Average scores, score distribution, and evaluation progress of team members',
    icon: <Users size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER'],
  },
  {
    id: 'org',
    labelKey: 'reports.scope.org',
    defaultLabel: 'Báo cáo Toàn công ty',
    badgeKey: 'reports.badge.org',
    defaultBadge: 'Organization-wide',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    badgeBgDark: 'rgba(124, 58, 237, 0.2)',
    descriptionKey: 'reports.desc.org',
    defaultDescription: 'Overall performance across departments, company-wide KPI completion rate',
    icon: <Building2 size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'summary',
    labelKey: 'reports.scope.summary',
    defaultLabel: 'Bảng tổng hợp KPI',
    badgeKey: 'reports.badge.summary',
    defaultBadge: 'Analytics Dashboard',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
    badgeBgDark: 'rgba(217, 119, 6, 0.2)',
    descriptionKey: 'reports.desc.summary',
    defaultDescription: "Look up an employee's official scores, criteria breakdown, and KPI relationships",
    icon: <BarChart3 size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
];

// Below this the whole page scrolls instead of squeezing the tables.
const HUB_PANEL_MIN_HEIGHT = '480px';

export const UnifiedPerformanceReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || 'EMPLOYEE') as ReportRole;

  const availableScopes = useMemo(
    () => REPORT_SCOPES.filter((scope) => scope.allowedRoles.includes(userRole)),
    [userRole]
  );

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

  const { tabHintProps, renderHintIcon, tooltip } = useHubTabTooltip();
  const activeLabelConfig = availableScopes.find((scope) => scope.id === activeScope);
  useHeaderTrail(activeLabelConfig ? t(activeLabelConfig.labelKey, activeLabelConfig.defaultLabel) : '');
  const roleLabel = t(roleLabelKey(userRole), humanizeRoleCode(userRole));

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        marginTop: '8px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="unified-hub-banner"
        style={{
          flexShrink: 0,
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderRadius: RADII.xl,
          border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
          boxShadow: SHADOWS.sm,
        }}
      >
        <div className="unified-hub-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="unified-hub-icon"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: RADII.lg,
                backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#f5f3ff',
                color: isDark ? '#c4b5fd' : '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="unified-hub-title" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                {t('reports.title', 'Trung Tâm Báo Cáo Hiệu Suất (Performance Reports)')}
              </h1>
              <p className="unified-hub-description hide-on-mobile" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                {t('reports.subtitle', 'Theo dõi kết quả đánh giá, phân tích xu hướng điểm số và xuất báo cáo đa chiều theo phạm vi')}
              </p>
            </div>
          </div>

          <div
            className="hide-on-mobile"
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
            <span>
              {t('reports.role_scope', 'Account Scope')}: {roleLabel}
            </span>
          </div>
        </div>

        <div className="unified-hub-tabs" role="tablist" style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}` }}>
          {availableScopes.map((scope) => {
            const isActive = activeScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleScopeChange(scope.id)}
                {...tabHintProps(t(scope.descriptionKey, scope.defaultDescription))}
                className="unified-hub-tab-btn"
                style={{
                  borderBottom: isActive ? `3px solid ${isDark ? '#a78bfa' : '#7c3aed'}` : '3px solid transparent',
                  backgroundColor: isActive ? (isDark ? '#1e293b' : '#f8fafc') : 'transparent',
                  color: isActive ? (isDark ? '#c4b5fd' : '#5b21b6') : (isDark ? '#94a3b8' : '#64748b'),
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <span style={{ color: isActive ? (isDark ? '#a78bfa' : '#7c3aed') : isDark ? '#64748b' : '#94a3b8' }}>
                  {scope.icon}
                </span>
                <span className="unified-hub-tab-label" data-label={t(scope.labelKey, scope.defaultLabel)}>
                  {t(scope.labelKey, scope.defaultLabel)}
                </span>
                <span
                  className="unified-hub-tab-badge"
                  style={{
                    backgroundColor: isDark ? scope.badgeBgDark : scope.badgeBg,
                    color: isDark ? '#ffffff' : scope.badgeColor,
                  }}
                >
                  {t(scope.badgeKey, scope.defaultBadge)}
                </span>
                {renderHintIcon(t(scope.descriptionKey, scope.defaultDescription), isActive)}
              </button>
            );
          })}
        </div>

        {tooltip}
      </div>

      {/* The panel does not scroll; each tab passes the height down to its main table.
          Tabs without a table (or a too-short window) fall back to the page scroll. */}
      <div role="tabpanel" className="fill-column" style={{ minHeight: HUB_PANEL_MIN_HEIGHT }}>
        {activeScope === 'my' && <EmployeeReportPage isEmbedded />}
        {activeScope === 'team' && <TeamReportPage isEmbedded />}
        {activeScope === 'org' && <OrganizationReportPage isEmbedded />}
        {activeScope === 'summary' && <KpiSummaryDashboardPage isEmbedded />}
      </div>
    </div>
  );
};
