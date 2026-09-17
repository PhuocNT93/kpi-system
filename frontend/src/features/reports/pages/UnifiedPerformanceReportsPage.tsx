import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { RADII, TYPOGRAPHY, SHADOWS } from '@/shared/theme';
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
  label: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  description: string;
  icon: React.ReactNode;
  allowedRoles: Array<'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE'>;
}

const REPORT_SCOPES: ReportScopeConfig[] = [
  {
    id: 'my',
    label: '1. Báo cáo của tôi',
    badge: 'Cá nhân',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    description: 'Chi tiết điểm số, radar năng lực và lịch sử đánh giá cá nhân qua các kỳ',
    icon: <User size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    id: 'team',
    label: '2. Báo cáo Đội nhóm',
    badge: 'Team & Phòng ban',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    description: 'Xếp hạng, phân phối điểm trung bình và tiến độ đánh giá của các thành viên trong nhóm',
    icon: <Users size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER'],
  },
  {
    id: 'org',
    label: '3. Báo cáo Toàn công ty',
    badge: 'Toàn tổ chức',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    description: 'Bức tranh tổng thể về hiệu suất giữa các bộ phận, tỷ lệ hoàn thành KPI toàn doanh nghiệp',
    icon: <Building2 size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'summary',
    label: '4. Bảng tổng hợp KPI',
    badge: 'Dashboard Thống kê',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
    description: 'Ma trận thống kê phân bổ hạng S, A, B, C, D và phân tích biến động chỉ số cốt lõi',
    icon: <BarChart3 size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
];

export const UnifiedPerformanceReportsPage: React.FC = () => {
  const { user } = useAuth();
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
    <div style={{ width: '100%', padding: '0 0 40px 0' }}>
      {/* Top Banner & Scope Switcher Hub */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: RADII.xl,
          border: '1px solid #e2e8f0',
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
                  backgroundColor: '#f5f3ff',
                  color: '#7c3aed',
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
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Trung Tâm Báo Cáo Hiệu Suất (Performance Reports)
                </h1>
                <p
                  style={{
                    margin: '3px 0 0 0',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    color: '#64748b',
                  }}
                >
                  Theo dõi kết quả đánh giá, phân tích xu hướng điểm số và xuất báo cáo đa chiều theo phạm vi
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
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 700,
            }}
          >
            <span>Phạm vi tài khoản: {userRole}</span>
          </div>
        </div>

        {/* Scope Selection Bar */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '2px',
            overflowX: 'auto',
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
                  borderBottom: isActive ? '3px solid #7c3aed' : '3px solid transparent',
                  backgroundColor: isActive ? '#f8fafc' : 'transparent',
                  color: isActive ? '#5b21b6' : '#64748b',
                  cursor: 'pointer',
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: isActive ? '#7c3aed' : '#94a3b8' }}>{scope.icon}</span>
                <span>{scope.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: RADII.full,
                    backgroundColor: scope.badgeBg,
                    color: scope.badgeColor,
                  }}
                >
                  {scope.badge}
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
              color: '#64748b',
            }}
          >
            <span>💡 {activeScopeConfig.description}</span>
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
