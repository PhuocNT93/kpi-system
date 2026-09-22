import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { RADII, TYPOGRAPHY, SHADOWS } from '@/shared/theme';
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
  label: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  description: string;
  icon: React.ReactNode;
  allowedRoles: Array<'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER'>;
}

const INGESTION_TABS: IngestionTabConfig[] = [
  {
    id: 'collectors',
    label: '1. Thu thập Tự động',
    badge: 'Batch AI',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    description: 'Batch job Jira PIM + Gemini AI đánh giá từng task — Chạy tự động hàng ngày hoặc thủ công',
    icon: <Sparkles size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER'],
  },
  {
    id: 'csv',
    label: '2. Nhập file CSV / Excel',
    badge: 'Batch File',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    description: 'Tải mẫu chuẩn, nạp file CSV/Excel hàng loạt và tra cứu lịch sử các đợt nạp file',
    icon: <FileSpreadsheet size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
];

export const DataIngestionHubPage: React.FC = () => {
  const { user } = useAuth();
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
    <div style={{ width: '100%', padding: '0 0 40px 0' }}>
      {/* Top Banner & Tab Navigation Hub */}
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
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
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
                  Trung Tâm Thu Thập & Nhập Liệu KPI
                </h1>
                <p
                  style={{
                    margin: '3px 0 0 0',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    color: '#64748b',
                  }}
                >
                  Batch AI tự động hàng ngày (Jira PIM + Gemini) và nhập file CSV/Excel
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
              backgroundColor: isManagerOnly ? '#fef3c7' : '#f0fdf4',
              border: `1px solid ${isManagerOnly ? '#fde68a' : '#bbf7d0'}`,
              color: isManagerOnly ? '#b45309' : '#15803d',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 700,
            }}
          >
            <span>Quyền hạn: {userRole}</span>
            {isManagerOnly && <span>(Phạm vi Đội nhóm)</span>}
          </div>
        </div>

        {/* 2 Main Tabs Selection Bar */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            borderBottom: '1px solid #e2e8f0',
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
                  backgroundColor: isActive ? '#f8fafc' : 'transparent',
                  color: isActive ? '#1e40af' : '#64748b',
                  cursor: 'pointer',
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: isActive ? '#2563eb' : '#94a3b8' }}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: RADII.full,
                    backgroundColor: tab.badgeBg,
                    color: tab.badgeColor,
                  }}
                >
                  {tab.badge}
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
              color: '#64748b',
            }}
          >
            <span>💡 {activeTabConfig.description}</span>
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
                backgroundColor: '#f1f5f9',
                borderRadius: RADII.lg,
                alignSelf: 'flex-start',
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
                  backgroundColor: collectorSubTab === 'jira' ? '#ffffff' : 'transparent',
                  color: collectorSubTab === 'jira' ? '#2563eb' : '#64748b',
                  fontWeight: collectorSubTab === 'jira' ? 700 : 500,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  cursor: 'pointer',
                  boxShadow: collectorSubTab === 'jira' ? SHADOWS.sm : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Sparkles size={16} />
                <span>🤖 Batch Scoring AI</span>
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
                  backgroundColor: collectorSubTab === 'blueprint' ? '#ffffff' : 'transparent',
                  color: collectorSubTab === 'blueprint' ? '#2563eb' : '#64748b',
                  fontWeight: collectorSubTab === 'blueprint' ? 700 : 500,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  cursor: 'pointer',
                  boxShadow: collectorSubTab === 'blueprint' ? SHADOWS.sm : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Activity size={16} />
                <span>Blueprint CLV</span>
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
                  backgroundColor: collectorSubTab === 'script' ? '#ffffff' : 'transparent',
                  color: collectorSubTab === 'script' ? '#0284c7' : '#64748b',
                  fontWeight: collectorSubTab === 'script' ? 700 : 500,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  cursor: 'pointer',
                  boxShadow: collectorSubTab === 'script' ? SHADOWS.sm : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Code2 size={16} />
                <span>⚙️ Cấu hình Script JQL</span>
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
                  backgroundColor: '#ffffff',
                  borderRadius: RADII.xl,
                  border: '1px solid #e2e8f0',
                }}
              >
                <ShieldAlert size={36} color="#d97706" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
                  Không có quyền truy cập kênh nạp CSV
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: TYPOGRAPHY.fontSize.sm, color: '#64748b' }}>
                  Tính năng nhập file CSV hàng loạt dành cho HR Admin và System Admin.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    gap: '8px',
                    padding: '6px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: RADII.lg,
                    alignSelf: 'flex-start',
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
                      backgroundColor: csvSubTab === 'upload' ? '#ffffff' : 'transparent',
                      color: csvSubTab === 'upload' ? '#059669' : '#64748b',
                      fontWeight: csvSubTab === 'upload' ? 700 : 500,
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      cursor: 'pointer',
                      boxShadow: csvSubTab === 'upload' ? SHADOWS.sm : 'none',
                    }}
                  >
                    <UploadCloud size={16} />
                    <span>Tải lên file CSV</span>
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
                      backgroundColor: csvSubTab === 'history' ? '#ffffff' : 'transparent',
                      color: csvSubTab === 'history' ? '#059669' : '#64748b',
                      fontWeight: csvSubTab === 'history' ? 700 : 500,
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      cursor: 'pointer',
                      boxShadow: csvSubTab === 'history' ? SHADOWS.sm : 'none',
                    }}
                  >
                    <History size={16} />
                    <span>Lịch sử các đợt nạp file</span>
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
