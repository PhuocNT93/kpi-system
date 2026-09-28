import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import {
  Mail,
  SlidersHorizontal,
  Activity,
  Bell,
} from 'lucide-react';

import { NotificationPreferencesPage } from './NotificationPreferencesPage';
import { NotificationTemplatesPage } from './NotificationTemplatesPage';
import { NotificationLogPage } from './NotificationLogPage';

export type NotificationTabId = 'preferences' | 'templates' | 'logs';

interface NotificationTabConfig {
  id: NotificationTabId;
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

const NOTIFICATION_TABS: NotificationTabConfig[] = [
  {
    id: 'preferences',
    labelKey: 'notifications.tab.preferences',
    defaultLabel: 'Tùy chọn thông báo',
    badgeKey: 'notifications.badge.personal',
    defaultBadge: 'Cá nhân',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBgDark: 'rgba(37, 99, 235, 0.2)',
    descriptionKey: 'notifications.desc.preferences',
    defaultDescription: 'Tùy chỉnh các loại sự kiện nhận qua Email: kết quả đánh giá, nhắc nhở hạn nộp, điều chỉnh điểm...',
    icon: <SlidersHorizontal size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    id: 'templates',
    labelKey: 'notifications.tab.templates',
    defaultLabel: 'Mẫu Email',
    badgeKey: 'notifications.badge.admin',
    defaultBadge: 'Quản trị',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    badgeBgDark: 'rgba(124, 58, 237, 0.2)',
    descriptionKey: 'notifications.desc.templates',
    defaultDescription: 'Quản lý, soạn thảo và tùy biến mẫu thông báo email song ngữ theo từng trạng thái chu kỳ KPI',
    icon: <Mail size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'logs',
    labelKey: 'notifications.tab.logs',
    defaultLabel: 'Nhật ký gửi',
    badgeKey: 'notifications.badge.system',
    defaultBadge: 'Hệ thống',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBgDark: 'rgba(5, 150, 105, 0.2)',
    descriptionKey: 'notifications.desc.logs',
    defaultDescription: 'Theo dõi lịch sử phát thông báo, kiểm tra email gửi thất bại và thực hiện gửi lại',
    icon: <Activity size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
];

export const UnifiedNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || 'EMPLOYEE') as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

  // Filter available tabs based on user role matrix
  const availableTabs = useMemo(() => {
    return NOTIFICATION_TABS.filter((tab) => tab.allowedRoles.includes(userRole));
  }, [userRole]);

  // Read active tab from URL query param `?tab=...`
  const rawTab = (searchParams.get('tab') || '').toLowerCase() as NotificationTabId;
  const activeTab: NotificationTabId = useMemo(() => {
    if (availableTabs.some((tab) => tab.id === rawTab)) {
      return rawTab;
    }
    return availableTabs[0]?.id || 'preferences';
  }, [availableTabs, rawTab]);

  const handleTabChange = (tabId: NotificationTabId) => {
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
        {/* Hub Header */}
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
                <Bell size={22} />
              </div>
              <div>
                <h1
                  className="unified-hub-title"
                  style={{
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                >
                  {t('notifications.hub_title', 'Trung Tâm Thông Báo & Email (Notifications Hub)')}
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
                    'notifications.hub_subtitle',
                    'Cấu hình tùy chọn nhận tin cá nhân, quản lý thông báo và theo dõi lịch sử gửi theo phân quyền'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* User Role Tag */}
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
                  borderBottom: isActive ? `3px solid ${isDark ? '#60a5fa' : '#2563eb'}` : '3px solid transparent',
                  backgroundColor: isActive ? (isDark ? '#1e293b' : '#f8fafc') : 'transparent',
                  color: isActive ? (isDark ? '#93c5fd' : '#1d4ed8') : (isDark ? '#94a3b8' : '#64748b'),
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <span style={{ color: isActive ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#64748b' : '#94a3b8') }}>
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

        {/* Active Tab Description Notice */}
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
        {activeTab === 'preferences' && <NotificationPreferencesPage />}
        {activeTab === 'templates' && <NotificationTemplatesPage />}
        {activeTab === 'logs' && <NotificationLogPage />}
      </div>
    </div>
  );
};
