import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import {
  ClipboardCheck,
  UserCheck,
  Users,
} from 'lucide-react';

import { MyEvaluationPage } from './MyEvaluationPage';
import { TeamEvaluationsPage } from './TeamEvaluationsPage';
import { EmployeeSearchPage } from '@/features/organization/pages/EmployeeSearchPage';
import { useHubTabTooltip } from '@/shared/ui/HubTabTooltip/use-hub-tab-tooltip';
import { useHeaderTrail } from '@/shared/layout/header-trail';

export type EvaluationTabId = 'my' | 'team' | 'search';

interface EvaluationTabConfig {
  id: EvaluationTabId;
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

const EVALUATION_TABS: EvaluationTabConfig[] = [
  {
    id: 'my',
    labelKey: 'evaluations.tab.my',
    defaultLabel: 'Đánh giá của tôi',
    badgeKey: 'evaluations.badge.my',
    defaultBadge: 'Cá nhân',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBgDark: 'rgba(37, 99, 235, 0.2)',
    descriptionKey: 'evaluations.desc.my',
    defaultDescription: 'Thực hiện bảng tự đánh giá KPI cá nhân theo chu kỳ, theo dõi trạng thái duyệt và phản hồi',
    icon: <ClipboardCheck size={18} />,
    allowedRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'team',
    labelKey: 'evaluations.tab.team',
    defaultLabel: 'Đánh giá đội nhóm',
    badgeKey: 'evaluations.badge.team',
    defaultBadge: 'Quản lý',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBgDark: 'rgba(5, 150, 105, 0.2)',
    descriptionKey: 'evaluations.desc.team',
    defaultDescription: 'Duyệt bảng tự đánh giá của các thành viên trong đội nhóm và tiến hành chấm điểm quản lý trực tiếp',
    icon: <UserCheck size={18} />,
    allowedRoles: ['MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    id: 'search',
    labelKey: 'evaluations.tab.search',
    defaultLabel: 'Tra cứu nhân sự',
    badgeKey: 'evaluations.badge.search',
    defaultBadge: 'Tra cứu',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    badgeBgDark: 'rgba(124, 58, 237, 0.2)',
    descriptionKey: 'evaluations.desc.search',
    defaultDescription: 'Tra cứu danh bạ nhân sự, vị trí công tác, phòng ban trực thuộc và lịch sử hồ sơ đánh giá',
    icon: <Users size={18} />,
    allowedRoles: ['MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'],
  },
];

export const UnifiedEvaluationsHubPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || 'EMPLOYEE') as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

  const availableTabs = useMemo(() => {
    return EVALUATION_TABS.filter((tab) => tab.allowedRoles.includes(userRole));
  }, [userRole]);

  const rawTab = (searchParams.get('tab') || '').toLowerCase() as EvaluationTabId;
  const activeTab: EvaluationTabId = useMemo(() => {
    if (availableTabs.some((tab) => tab.id === rawTab)) {
      return rawTab;
    }
    return availableTabs[0]?.id || 'my';
  }, [availableTabs, rawTab]);

  const handleTabChange = (tabId: EvaluationTabId) => {
    setSearchParams({ tab: tabId });
  };

  const { tabHintProps, renderHintIcon, tooltip } = useHubTabTooltip();
  const activeLabelConfig = availableTabs.find((tab) => tab.id === activeTab);
  useHeaderTrail(activeLabelConfig ? t(activeLabelConfig.labelKey, activeLabelConfig.defaultLabel) : '');

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', padding: '0 0 40px 0', marginTop: '8px' }}>
      {/* Top Banner & Tab Switcher Hub */}
      <div
        className="unified-hub-banner"
        style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderRadius: RADII.xl,
          border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
          boxShadow: SHADOWS.sm,
        }}
      >
        <div className="unified-hub-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="unified-hub-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: RADII.lg,
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                  color: isDark ? '#93c5fd' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ClipboardCheck size={22} />
              </div>
              <div>
                <h1 className="unified-hub-title" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {t('evaluations.hub_title', 'Trung Tâm Đánh Giá Hiệu Suất')}
                </h1>
                <p className="unified-hub-description hide-on-mobile" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  {t(
                    'evaluations.hub_subtitle',
                    'Thực hiện tự đánh giá cá nhân, chấm điểm nhân viên đội nhóm và tra cứu hồ sơ đánh giá'
                  )}
                </p>
              </div>
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
            <span>{t('common.role', 'Vai trò')}: {userRole}</span>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div
          className="unified-hub-tabs"
          style={{
            borderBottom: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
          }}
        >
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                {...tabHintProps(t(tab.descriptionKey, tab.defaultDescription))}
                className="unified-hub-tab-btn"
                style={{
                  borderBottom: isActive ? `3px solid ${isDark ? '#60a5fa' : '#2563eb'}` : '3px solid transparent',
                  backgroundColor: isActive ? (isDark ? '#1e293b' : '#f8fafc') : 'transparent',
                  color: isActive ? (isDark ? '#93c5fd' : '#1d4ed8') : (isDark ? '#94a3b8' : '#64748b'),
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <span style={{ color: isActive ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#64748b' : '#94a3b8') }}>
                  {tab.icon}
                </span>
                <span className="unified-hub-tab-label" data-label={t(tab.labelKey, tab.defaultLabel)}>
                  {t(tab.labelKey, tab.defaultLabel)}
                </span>
                <span
                  className="unified-hub-tab-badge"
                  style={{
                    backgroundColor: isDark ? tab.badgeBgDark : tab.badgeBg,
                    color: isDark ? '#ffffff' : tab.badgeColor,
                  }}
                >
                  {t(tab.badgeKey, tab.defaultBadge)}
                </span>
                {renderHintIcon(t(tab.descriptionKey, tab.defaultDescription), isActive)}
              </button>
            );
          })}
        </div>

        {tooltip}
      </div>

      {/* Tab Content Display Area */}
      <div>
        {activeTab === 'my' && <MyEvaluationPage />}
        {activeTab === 'team' && <TeamEvaluationsPage />}
        {activeTab === 'search' && <EmployeeSearchPage />}
      </div>
    </div>
  );
};
