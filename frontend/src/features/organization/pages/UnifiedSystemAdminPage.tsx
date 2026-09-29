import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { humanizeRoleCode, roleLabelKey } from '@/shared/auth/role-label';
import { SubTabs } from '@/shared/ui/SubTabs/SubTabs';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import {
  Users,
  Shield,
  ShieldCheck,
  Languages,
  UserCheck,
  Lock,
  Key,
} from 'lucide-react';

import { OrganizationPage } from './OrganizationPage';
import { AuditLogPage } from '@/features/audit/pages/AuditLogPage';
import { I18nPage } from '@/features/i18n/pages/I18nPage';
import { UserTable } from '@/features/iam/components/UserTable';
import { RoleTable } from '@/features/iam/components/RoleTable';
import { PermissionTable } from '@/features/iam/components/PermissionTable';
import { useHubTabTooltip } from '@/shared/ui/HubTabTooltip/use-hub-tab-tooltip';
import { useHeaderTrail } from '@/shared/layout/header-trail';

// Below this the whole page scrolls instead of squeezing the tables.
const HUB_PANEL_MIN_HEIGHT = '480px';

export type SystemTabId = 'organization' | 'iam' | 'audit' | 'i18n';
export type IamSubTabId = 'users' | 'roles' | 'permissions';

interface SystemTabConfig {
  id: SystemTabId;
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

const SYSTEM_TABS: SystemTabConfig[] = [
  {
    id: 'organization',
    labelKey: 'sysadmin.tab.organization',
    defaultLabel: 'Cơ cấu tổ chức',
    badgeKey: 'sysadmin.badge.org',
    defaultBadge: 'Tổ chức',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBgDark: 'rgba(37, 99, 235, 0.2)',
    descriptionKey: 'sysadmin.desc.organization',
    defaultDescription: 'Sơ đồ cây phòng ban, phân cấp quản lý và danh mục chức danh chức vụ nhân sự',
    icon: <Users size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'iam',
    labelKey: 'sysadmin.tab.iam',
    defaultLabel: 'Tài khoản & Phân quyền',
    badgeKey: 'sysadmin.badge.iam',
    defaultBadge: 'Bảo mật',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    badgeBgDark: 'rgba(124, 58, 237, 0.2)',
    descriptionKey: 'sysadmin.desc.iam',
    defaultDescription: 'Quản lý tài khoản đăng nhập, nhóm vai trò và ma trận quyền hạn hệ thống (RBAC)',
    icon: <Shield size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'audit',
    labelKey: 'sysadmin.tab.audit',
    defaultLabel: 'Nhật ký kiểm toán',
    badgeKey: 'sysadmin.badge.audit',
    defaultBadge: 'Giám sát',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBgDark: 'rgba(5, 150, 105, 0.2)',
    descriptionKey: 'sysadmin.desc.audit',
    defaultDescription: 'Truy vết toàn bộ lịch sử thao tác, can thiệp số liệu đánh giá và sự kiện bảo mật',
    icon: <ShieldCheck size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'i18n',
    labelKey: 'sysadmin.tab.i18n',
    defaultLabel: 'Đa ngôn ngữ',
    badgeKey: 'sysadmin.badge.i18n',
    defaultBadge: 'Bản địa hóa',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
    badgeBgDark: 'rgba(217, 119, 6, 0.2)',
    descriptionKey: 'sysadmin.desc.i18n',
    defaultDescription: 'Quản trị từ điển nhãn giao diện song ngữ Tiếng Việt và Tiếng Anh trên toàn hệ thống',
    icon: <Languages size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
];

export const UnifiedSystemAdminPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [iamSubTab, setIamSubTab] = useState<IamSubTabId>('users');

  const userRole = (user?.role || 'EMPLOYEE') as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

  const availableTabs = useMemo(() => {
    return SYSTEM_TABS.filter((tab) => tab.allowedRoles.includes(userRole));
  }, [userRole]);

  const rawTab = (searchParams.get('tab') || '').toLowerCase() as SystemTabId;
  const activeTab: SystemTabId = useMemo(() => {
    if (availableTabs.some((tab) => tab.id === rawTab)) {
      return rawTab;
    }
    return availableTabs[0]?.id || 'organization';
  }, [availableTabs, rawTab]);

  const handleTabChange = (tabId: SystemTabId) => {
    setSearchParams({ tab: tabId });
  };

  const { tabHintProps, renderHintIcon, tooltip } = useHubTabTooltip();
  const activeLabelConfig = availableTabs.find((tab) => tab.id === activeTab);
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
      {/* Top Banner & Tab Switcher Hub */}
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
                <Shield size={22} />
              </div>
              <div>
                <h1 className="unified-hub-title" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {t('sysadmin.hub_title', 'Quản Trị Hệ Thống & Bảo Mật')}
                </h1>
                <p className="unified-hub-description hide-on-mobile" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  {t(
                    'sysadmin.hub_subtitle',
                    'Quản lý cơ cấu phòng ban, phân quyền tài khoản người dùng, nhật ký kiểm toán và cấu hình đa ngôn ngữ'
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
            <span>{t('common.role', 'Vai trò')}: {roleLabel}</span>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div
          className="unified-hub-tabs"
          role="tablist"
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
                role="tab"
                aria-selected={isActive}
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

      {/* Tab Content Display Area — does not scroll; each tab passes the height down to its main table */}
      <div
        role="tabpanel"
        className="fill-column"
        style={{ minHeight: HUB_PANEL_MIN_HEIGHT }}
      >
        {activeTab === 'organization' && <OrganizationPage />}
        {activeTab === 'iam' && (
          <div className="fill-column">
            <SubTabs<IamSubTabId>
              ariaLabel={t('sysadmin.tab.iam', 'Tài khoản & Phân quyền')}
              value={iamSubTab}
              onChange={setIamSubTab}
              items={[
                { id: 'users', label: t('iam.tabs.users', 'Users'), icon: <UserCheck size={16} /> },
                { id: 'roles', label: t('iam.tabs.roles', 'Roles'), icon: <Lock size={16} /> },
                { id: 'permissions', label: t('iam.tabs.permissions', 'Permissions'), icon: <Key size={16} /> },
              ]}
            />
            {iamSubTab === 'users' && <UserTable />}
            {iamSubTab === 'roles' && <RoleTable />}
            {iamSubTab === 'permissions' && <PermissionTable />}
          </div>
        )}
        {activeTab === 'audit' && <AuditLogPage isEmbedded />}
        {activeTab === 'i18n' && <I18nPage />}
      </div>
    </div>
  );
};
