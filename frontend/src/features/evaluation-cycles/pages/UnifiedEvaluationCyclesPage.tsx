import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import {
  CalendarRange,
  UserPlus,
  Clock,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';

import { EvaluationCycleListPage } from './EvaluationCycleListPage';
import { IndividualCycleCreatePage } from './IndividualCycleCreatePage';
import { ReviewDueDashboard } from './ReviewDueDashboard';
import { ReviewCadencesPage } from '@/features/organization/pages/ReviewCadencesPage';
import { CalibrationPage } from '@/features/calibration/pages/CalibrationPage';
import { useHubTabTooltip } from '@/shared/ui/HubTabTooltip/use-hub-tab-tooltip';
import { useHeaderTrail } from '@/shared/layout/header-trail';

export type CycleTabId = 'cycles' | 'individual' | 'review-due' | 'cadences' | 'calibration';

interface CycleTabConfig {
  id: CycleTabId;
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

const CYCLE_TABS: CycleTabConfig[] = [
  {
    id: 'cycles',
    labelKey: 'cycles.tab.cycles',
    defaultLabel: 'Chu kỳ công ty',
    badgeKey: 'cycles.badge.company',
    defaultBadge: 'Toàn công ty',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBgDark: 'rgba(37, 99, 235, 0.2)',
    descriptionKey: 'cycles.desc.cycles',
    defaultDescription: 'Quản lý danh sách, trạng thái và vòng đời các kỳ đánh giá hiệu suất định kỳ của doanh nghiệp',
    icon: <CalendarRange size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'individual',
    labelKey: 'cycles.tab.individual',
    defaultLabel: 'Đánh giá cá nhân',
    badgeKey: 'cycles.badge.individual',
    defaultBadge: 'Cá nhân & Thử việc',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBgDark: 'rgba(5, 150, 105, 0.2)',
    descriptionKey: 'cycles.desc.individual',
    defaultDescription: 'Khởi tạo chu kỳ đánh giá riêng cho nhân sự hết hạn thử việc, bổ nhiệm hoặc yêu cầu đột xuất',
    icon: <UserPlus size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER'],
  },
  {
    id: 'review-due',
    labelKey: 'cycles.tab.review_due',
    defaultLabel: 'Hạn chót & Tiến độ',
    badgeKey: 'cycles.badge.review_due',
    defaultBadge: 'Tiến độ',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
    badgeBgDark: 'rgba(217, 119, 6, 0.2)',
    descriptionKey: 'cycles.desc.review_due',
    defaultDescription: 'Theo dõi tiến độ hoàn thành, danh sách nhân viên và quản lý sắp tới hạn hoặc trễ hạn nộp đánh giá',
    icon: <Clock size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER'],
  },
  {
    id: 'cadences',
    labelKey: 'cycles.tab.cadences',
    defaultLabel: 'Tần suất định kỳ',
    badgeKey: 'cycles.badge.cadences',
    defaultBadge: 'Cấu hình',
    badgeColor: '#4f46e5',
    badgeBg: '#eef2ff',
    badgeBgDark: 'rgba(79, 70, 229, 0.2)',
    descriptionKey: 'cycles.desc.cadences',
    defaultDescription: 'Thiết lập quy luật chu kỳ đánh giá tự động theo phòng ban (Hàng tháng, Quý, Nửa năm, Năm)',
    icon: <RefreshCw size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'calibration',
    labelKey: 'cycles.tab.calibration',
    defaultLabel: 'Hiệu chuẩn điểm',
    badgeKey: 'cycles.badge.calibration',
    defaultBadge: 'Hiệu chuẩn',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    badgeBgDark: 'rgba(124, 58, 237, 0.2)',
    descriptionKey: 'cycles.desc.calibration',
    defaultDescription: 'Hội đồng hiệu chuẩn rà soát phân phối điểm số, xếp loại và cân bằng theo đường cong chuẩn (Bell Curve)',
    icon: <SlidersHorizontal size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
];

export const UnifiedEvaluationCyclesPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || 'EMPLOYEE') as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

  // Filter tabs based on roles matrix
  const availableTabs = useMemo(() => {
    return CYCLE_TABS.filter((tab) => tab.allowedRoles.includes(userRole));
  }, [userRole]);

  // Read active tab from URL query param `?tab=...`
  const rawTab = (searchParams.get('tab') || '').toLowerCase() as CycleTabId;
  const activeTab: CycleTabId = useMemo(() => {
    if (availableTabs.some((tab) => tab.id === rawTab)) {
      return rawTab;
    }
    return availableTabs[0]?.id || 'cycles';
  }, [availableTabs, rawTab]);

  const handleTabChange = (tabId: CycleTabId) => {
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
                <CalendarRange size={22} />
              </div>
              <div>
                <h1 className="unified-hub-title" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {t('cycles.hub_title', 'Quản Lý Chu Kỳ & Tiến Độ')}
                </h1>
                <p className="unified-hub-description hide-on-mobile" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  {t(
                    'cycles.hub_subtitle',
                    'Tổng hợp điều hành chu kỳ công ty, đánh giá thử việc, cảnh báo tiến độ và phiên họp hiệu chuẩn'
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
        {activeTab === 'cycles' && <EvaluationCycleListPage />}
        {activeTab === 'individual' && <IndividualCycleCreatePage />}
        {activeTab === 'review-due' && <ReviewDueDashboard />}
        {activeTab === 'cadences' && <ReviewCadencesPage />}
        {activeTab === 'calibration' && <CalibrationPage />}
      </div>
    </div>
  );
};
