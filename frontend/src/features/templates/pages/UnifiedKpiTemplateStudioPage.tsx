import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import {
  LayoutTemplate,
  GitFork,
  SlidersHorizontal,
} from 'lucide-react';

import { EvaluationTemplatesPage } from './EvaluationTemplatesPage';
import { KpiPage } from '@/features/kpi/pages/KpiPage';
import { CriteriaPage } from '@/features/criteria/pages/CriteriaPage';

export type StudioTabId = 'templates' | 'kpis' | 'criteria';

interface StudioTabConfig {
  id: StudioTabId;
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

const STUDIO_TABS: StudioTabConfig[] = [
  {
    id: 'templates',
    labelKey: 'studio.tab.templates',
    defaultLabel: 'Mẫu biểu đánh giá',
    badgeKey: 'studio.badge.templates',
    defaultBadge: 'Mẫu biểu',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBgDark: 'rgba(37, 99, 235, 0.2)',
    descriptionKey: 'studio.desc.templates',
    defaultDescription: 'Trình thiết kế biểu mẫu đánh giá kết hợp chỉ số định lượng KPI và tiêu chí hành vi theo chức vụ',
    icon: <LayoutTemplate size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'kpis',
    labelKey: 'studio.tab.kpis',
    defaultLabel: 'Thư viện KPI',
    badgeKey: 'studio.badge.kpis',
    defaultBadge: 'Chỉ số',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBgDark: 'rgba(5, 150, 105, 0.2)',
    descriptionKey: 'studio.desc.kpis',
    defaultDescription: 'Quản lý danh mục chỉ số đo lường hiệu suất, công thức tính điểm, đơn vị tính và trọng số mẫu',
    icon: <GitFork size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'criteria',
    labelKey: 'studio.tab.criteria',
    defaultLabel: 'Tiêu chuẩn & Quy tắc',
    badgeKey: 'studio.badge.criteria',
    defaultBadge: 'Quy tắc',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    badgeBgDark: 'rgba(124, 58, 237, 0.2)',
    descriptionKey: 'studio.desc.criteria',
    defaultDescription: 'Xây dựng bộ tiêu chí năng lực, hành vi chuẩn mực, khung thang điểm và ma trận tính điểm',
    icon: <SlidersHorizontal size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
];

export const UnifiedKpiTemplateStudioPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || 'EMPLOYEE') as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

  const availableTabs = useMemo(() => {
    return STUDIO_TABS.filter((tab) => tab.allowedRoles.includes(userRole));
  }, [userRole]);

  const rawTab = (searchParams.get('tab') || '').toLowerCase() as StudioTabId;
  const activeTab: StudioTabId = useMemo(() => {
    if (availableTabs.some((tab) => tab.id === rawTab)) {
      return rawTab;
    }
    return availableTabs[0]?.id || 'templates';
  }, [availableTabs, rawTab]);

  const handleTabChange = (tabId: StudioTabId) => {
    setSearchParams({ tab: tabId });
  };

  const activeTabConfig = availableTabs.find((tab) => tab.id === activeTab);

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
                  backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#f5f3ff',
                  color: isDark ? '#c4b5fd' : '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LayoutTemplate size={22} />
              </div>
              <div>
                <h1
                  className="unified-hub-title"
                  style={{
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                >
                  {t('studio.hub_title', 'Trung Tâm Tiêu Chí & Biểu Mẫu')}
                </h1>
                <p
                  className="hide-on-mobile"
                  style={{
                    margin: '3px 0 0 0',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    color: isDark ? '#94a3b8' : '#64748b',
                  }}
                >
                  {t(
                    'studio.hub_subtitle',
                    'Định nghĩa thư viện chỉ số KPI, chuẩn hóa bộ quy tắc tiêu chí và thiết kế biểu mẫu đánh giá trực quan'
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
                className="unified-hub-tab-btn"
                style={{
                  borderBottom: isActive ? `3px solid ${isDark ? '#a78bfa' : '#7c3aed'}` : '3px solid transparent',
                  backgroundColor: isActive ? (isDark ? '#1e293b' : '#f8fafc') : 'transparent',
                  color: isActive ? (isDark ? '#c4b5fd' : '#5b21b6') : (isDark ? '#94a3b8' : '#64748b'),
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <span style={{ color: isActive ? (isDark ? '#a78bfa' : '#7c3aed') : (isDark ? '#64748b' : '#94a3b8') }}>
                  {tab.icon}
                </span>
                <span>{t(tab.labelKey, tab.defaultLabel)}</span>
                <span
                  className="unified-hub-tab-badge"
                  style={{
                    backgroundColor: isDark ? tab.badgeBgDark : tab.badgeBg,
                    color: isDark ? '#ffffff' : tab.badgeColor,
                  }}
                >
                  {t(tab.badgeKey, tab.defaultBadge)}
                </span>
              </button>
            );
          })}
        </div>

        {activeTabConfig && (
          <div
            className="unified-hub-hint hide-on-mobile"
            style={{
              color: isDark ? '#94a3b8' : '#64748b',
            }}
          >
            <span>💡 {t(activeTabConfig.descriptionKey, activeTabConfig.defaultDescription)}</span>
          </div>
        )}
      </div>

      {/* Tab Content Display Area */}
      <div>
        {activeTab === 'templates' && <EvaluationTemplatesPage />}
        {activeTab === 'kpis' && <KpiPage />}
        {activeTab === 'criteria' && <CriteriaPage />}
      </div>
    </div>
  );
};
