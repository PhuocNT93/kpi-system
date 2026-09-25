import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import {
  Sparkles,
  FileSpreadsheet,
  Activity,
  Code2,
  UploadCloud,
  History,
  ShieldAlert,
} from 'lucide-react';

import { CollectorPage } from '@/features/collector/pages/CollectorPage';
import { JiraCollectorPage } from '@/features/collector/pages/JiraCollectorPage';
import { CollectorScriptEditorPage } from '@/features/collector/pages/CollectorScriptEditorPage';
import { ImportUploadPage } from '@/features/imports/pages/ImportUploadPage';
import { ImportHistoryPage } from '@/features/imports/pages/ImportHistoryPage';

export type IngestionTabId = 'collectors' | 'csv';

interface IngestionTabConfig {
  id: IngestionTabId;
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
  allowedRoles: Array<'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER'>;
}

const INGESTION_TABS: IngestionTabConfig[] = [
  {
    id: 'collectors',
    labelKey: 'ingestion.tab_collectors',
    defaultLabel: '1. Thu thập Tự động',
    badgeKey: 'ingestion.badge_batch_ai',
    defaultBadge: 'Batch AI',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeBgDark: 'rgba(37, 99, 235, 0.2)',
    descriptionKey: 'ingestion.desc_collectors',
    defaultDescription: 'Batch job Jira PIM + Gemini AI đánh giá từng task — Chạy tự động hàng ngày hoặc thủ công',
    icon: <Sparkles size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER'],
  },
  {
    id: 'csv',
    labelKey: 'ingestion.tab_csv',
    defaultLabel: '2. Nhập file CSV / Excel',
    badgeKey: 'ingestion.badge_batch_file',
    defaultBadge: 'Batch File',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    badgeBgDark: 'rgba(5, 150, 105, 0.2)',
    descriptionKey: 'ingestion.desc_csv',
    defaultDescription: 'Tải mẫu chuẩn, nạp file CSV/Excel hàng loạt và tra cứu lịch sử các đợt nạp file',
    icon: <FileSpreadsheet size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
];

export const DataIngestionHubPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || 'EMPLOYEE') as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  const isManagerOnly = userRole === 'MANAGER';

  // Sub-tab states
  const [collectorSubTab, setCollectorSubTab] = useState<'jira' | 'blueprint' | 'script'>('jira');
  const [csvSubTab, setCsvSubTab] = useState<'upload' | 'history'>('upload');

  // Filter available tabs based on user's role
  const availableTabs = useMemo(() => {
    return INGESTION_TABS.filter((tab) => tab.allowedRoles.includes(userRole as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER'));
  }, [userRole]);

  // Read active tab from URL query param `?tab=...` with backward compatibility
  const rawParam = (searchParams.get('tab') || '').toLowerCase();

  const activeTab: IngestionTabId = useMemo(() => {
    if (rawParam === 'jira' || rawParam === 'blueprint' || rawParam === 'script') {
      return 'collectors';
    }
    if (rawParam === 'history') {
      return 'csv';
    }
    if (availableTabs.some((t) => t.id === rawParam)) {
      return rawParam as IngestionTabId;
    }
    return availableTabs[0]?.id || 'collectors';
  }, [availableTabs, rawParam]);

  // Handle URL deep-linking into sub-tabs
  useEffect(() => {
    if (rawParam === 'blueprint') setCollectorSubTab('blueprint');
    else if (rawParam === 'script') setCollectorSubTab('script');
    else if (rawParam === 'jira') setCollectorSubTab('jira');
    else if (rawParam === 'history') setCsvSubTab('history');
  }, [rawParam]);

  const handleTabChange = (tabId: IngestionTabId) => {
    setSearchParams({ tab: tabId });
  };

  const activeTabConfig = availableTabs.find((t) => t.id === activeTab);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', padding: '0 0 40px 0' }}>
      {/* Top Banner & Tab Navigation Hub */}
      <div
        style={{
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderRadius: RADII.xl,
          border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
          boxShadow: SHADOWS.sm,
          padding: 'clamp(16px, 3vw, 24px) clamp(16px, 3.5vw, 28px)',
          marginBottom: '24px',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: RADII.lg,
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff',
                  color: isDark ? '#60a5fa' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)',
                    fontWeight: 800,
                    color: isDark ? '#f9fafb' : '#0f172a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {t('ingestion.hub_title', 'Trung Tâm Thu Thập & Nhập Liệu KPI')}
                </h1>
                <p
                  style={{
                    margin: '3px 0 0 0',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    color: isDark ? '#94a3b8' : '#64748b',
                  }}
                >
                  {t('ingestion.hub_subtitle', 'Batch AI tự động hàng ngày (Jira PIM + Gemini) và nhập file CSV/Excel')}
                </p>
              </div>
            </div>
          </div>

          {/* Role Status Tag */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: RADII.full,
              backgroundColor: isManagerOnly
                ? (isDark ? 'rgba(217, 119, 6, 0.2)' : '#fef3c7')
                : (isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4'),
              border: `1px solid ${isManagerOnly ? (isDark ? '#78350f' : '#fde68a') : (isDark ? '#064e3b' : '#bbf7d0')}`,
              color: isManagerOnly ? (isDark ? '#fbbf24' : '#b45309') : (isDark ? '#34d399' : '#15803d'),
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 700,
            }}
          >
            <span>{t('ingestion.role_label', `Quyền hạn: ${userRole}`, { role: userRole })}</span>
            {isManagerOnly && <span>{t('ingestion.team_scope', '(Phạm vi Đội nhóm)')}</span>}
          </div>
        </div>

        {/* 2 Main Tabs Selection Bar */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            borderBottom: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
            paddingBottom: '2px',
            overflowX: 'auto',
          }}
        >
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: `${RADII.lg} ${RADII.lg} 0 0`,
                  border: 'none',
                  borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  backgroundColor: isActive ? (isDark ? '#1e293b' : '#f8fafc') : 'transparent',
                  color: isActive ? (isDark ? '#93c5fd' : '#1e40af') : (isDark ? '#94a3b8' : '#64748b'),
                  cursor: 'pointer',
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: isActive ? '#3b82f6' : (isDark ? '#64748b' : '#94a3b8') }}>{tab.icon}</span>
                <span>{t(tab.labelKey, tab.defaultLabel)}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: RADII.full,
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

        {/* Active Tab Helper Notice */}
        {activeTabConfig && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              fontSize: TYPOGRAPHY.fontSize.xs,
              color: isDark ? '#94a3b8' : '#64748b',
            }}
          >
            <span>💡 {t(activeTabConfig.descriptionKey, activeTabConfig.defaultDescription)}</span>
          </div>
        )}
      </div>

      {/* Tab Content Display Area */}
      <div>
        {/* TAB 1: THU THẬP TỰ ĐỘNG (Batch AI + Blueprint + Script Config) */}
        {activeTab === 'collectors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Sub-navigation pills */}
            <div
              style={{
                display: 'inline-flex',
                gap: '8px',
                padding: '6px',
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                borderRadius: RADII.lg,
                alignSelf: 'flex-start',
                flexWrap: 'wrap',
                border: `1px solid ${isDark ? '#334155' : 'transparent'}`,
              }}
            >
              <button
                type="button"
                onClick={() => setCollectorSubTab('jira')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: RADII.md,
                  border: 'none',
                  backgroundColor: collectorSubTab === 'jira' ? (isDark ? '#0f172a' : '#ffffff') : 'transparent',
                  color: collectorSubTab === 'jira' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
                  fontWeight: collectorSubTab === 'jira' ? 700 : 500,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  cursor: 'pointer',
                  boxShadow: collectorSubTab === 'jira' ? SHADOWS.sm : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Sparkles size={16} />
                <span>🤖 {t('ingestion.subtab_jira', 'Batch Scoring AI')}</span>
              </button>

              <button
                type="button"
                onClick={() => setCollectorSubTab('blueprint')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: RADII.md,
                  border: 'none',
                  backgroundColor: collectorSubTab === 'blueprint' ? (isDark ? '#0f172a' : '#ffffff') : 'transparent',
                  color: collectorSubTab === 'blueprint' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
                  fontWeight: collectorSubTab === 'blueprint' ? 700 : 500,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  cursor: 'pointer',
                  boxShadow: collectorSubTab === 'blueprint' ? SHADOWS.sm : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Activity size={16} />
                <span>{t('ingestion.subtab_blueprint', 'Blueprint CLV')}</span>
              </button>

              <button
                type="button"
                onClick={() => setCollectorSubTab('script')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: RADII.md,
                  border: 'none',
                  backgroundColor: collectorSubTab === 'script' ? (isDark ? '#0f172a' : '#ffffff') : 'transparent',
                  color: collectorSubTab === 'script' ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#94a3b8' : '#64748b'),
                  fontWeight: collectorSubTab === 'script' ? 700 : 500,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  cursor: 'pointer',
                  boxShadow: collectorSubTab === 'script' ? SHADOWS.sm : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Code2 size={16} />
                <span>⚙️ {t('ingestion.subtab_script', 'Cấu hình Script JQL')}</span>
              </button>
            </div>

            {/* Sub-tab view */}
            {collectorSubTab === 'jira' && <JiraCollectorPage />}
            {collectorSubTab === 'blueprint' && <CollectorPage />}
            {collectorSubTab === 'script' && <CollectorScriptEditorPage />}
          </div>
        )}

        {/* TAB 2: NHẬP FILE CSV / EXCEL */}
        {activeTab === 'csv' && (
          <div>
            {userRole === 'MANAGER' ? (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  backgroundColor: isDark ? '#111827' : '#ffffff',
                  borderRadius: RADII.xl,
                  border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                }}
              >
                <ShieldAlert size={36} color="#d97706" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ margin: 0, fontSize: '16px', color: isDark ? '#f9fafb' : '#1e293b' }}>
                  {t('ingestion.no_csv_access', 'Không có quyền truy cập kênh nạp CSV')}
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: TYPOGRAPHY.fontSize.sm, color: isDark ? '#94a3b8' : '#64748b' }}>
                  {t('ingestion.csv_role_desc', 'Tính năng nhập file CSV hàng loạt dành cho HR Admin và System Admin.')}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    gap: '8px',
                    padding: '6px',
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    borderRadius: RADII.lg,
                    alignSelf: 'flex-start',
                    flexWrap: 'wrap',
                    border: `1px solid ${isDark ? '#334155' : 'transparent'}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCsvSubTab('upload')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: RADII.md,
                      border: 'none',
                      backgroundColor: csvSubTab === 'upload' ? (isDark ? '#0f172a' : '#ffffff') : 'transparent',
                      color: csvSubTab === 'upload' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#94a3b8' : '#64748b'),
                      fontWeight: csvSubTab === 'upload' ? 700 : 500,
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      cursor: 'pointer',
                      boxShadow: csvSubTab === 'upload' ? SHADOWS.sm : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <UploadCloud size={16} />
                    <span>📥 {t('ingestion.subtab_upload', 'Tải lên File CSV / Excel')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCsvSubTab('history')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: RADII.md,
                      border: 'none',
                      backgroundColor: csvSubTab === 'history' ? (isDark ? '#0f172a' : '#ffffff') : 'transparent',
                      color: csvSubTab === 'history' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#94a3b8' : '#64748b'),
                      fontWeight: csvSubTab === 'history' ? 700 : 500,
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      cursor: 'pointer',
                      boxShadow: csvSubTab === 'history' ? SHADOWS.sm : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <History size={16} />
                    <span>📋 {t('ingestion.subtab_history', 'Lịch sử & Kết quả Nạp file')}</span>
                  </button>
                </div>

                {csvSubTab === 'upload' && <ImportUploadPage />}
                {csvSubTab === 'history' && <ImportHistoryPage />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataIngestionHubPage;
