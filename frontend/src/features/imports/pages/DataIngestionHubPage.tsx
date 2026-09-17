import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { RADII, TYPOGRAPHY, SHADOWS } from '@/shared/theme';
import {
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  Code2,
  History,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import { CollectorPage } from '@/features/collector/pages/CollectorPage';
import { JiraCollectorPage } from '@/features/collector/pages/JiraCollectorPage';
import { ImportUploadPage } from '@/features/imports/pages/ImportUploadPage';
import { EvaluationDataImportPage } from '@/features/imports/pages/EvaluationDataImportPage';
import { ImportHistoryPage } from '@/features/imports/pages/ImportHistoryPage';

export type IngestionTabId = 'blueprint' | 'jira' | 'csv' | 'api' | 'history';

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
    id: 'blueprint',
    label: '1. Thu thập Blueprint',
    badge: 'SSO Portal',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
    description: 'Đối soát Chuyên cần (TAT_029, TAT_028) & Nghỉ phép (TAT_011) theo Team/Nhân sự',
    icon: <Activity size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER'],
  },
  {
    id: 'jira',
    label: '2. Thu thập Jira (PIM)',
    badge: 'Jira Server API',
    badgeColor: '#0052cc',
    badgeBg: '#deebff',
    description: 'Module 2: Quản lý Task, Giờ làm việc (Worklog) & Tỷ lệ đúng hạn trực tiếp từ Jira Server (UI_PIM_001)',
    icon: <CheckCircle2 size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER'],
  },
  {
    id: 'csv',
    label: '3. Nhập file CSV Hàng loạt',
    badge: 'Batch File',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    description: 'Tải mẫu chuẩn, nạp file CSV/Excel chấm công, doanh số, sản lượng toàn công ty',
    icon: <FileSpreadsheet size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'api',
    label: '4. Tích hợp API & Bằng chứng',
    badge: 'Jira / Git JSON',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
    description: 'Nhập payload có cấu trúc kèm URL bằng chứng (Evidence) & Giải quyết xung đột điểm',
    icon: <Code2 size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
  {
    id: 'history',
    label: '5. Lịch sử Nhập liệu',
    badge: 'Audit Trail',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
    description: 'Theo dõi tiến độ, chi tiết các đợt nạp dữ liệu và nhật ký xử lý lỗi',
    icon: <History size={18} />,
    allowedRoles: ['SYSTEM_ADMIN', 'HR_ADMIN'],
  },
];

export const DataIngestionHubPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || 'EMPLOYEE') as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  const isManagerOnly = userRole === 'MANAGER';

  // Filter available tabs based on user's role
  const availableTabs = useMemo(() => {
    return INGESTION_TABS.filter((tab) => tab.allowedRoles.includes(userRole as 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'MANAGER'));
  }, [userRole]);

  // Read active tab from URL query param `?tab=...`, falling back to first accessible tab
  const rawTab = (searchParams.get('tab') || '').toLowerCase() as IngestionTabId;
  const activeTab: IngestionTabId = useMemo(() => {
    if (availableTabs.some((t) => t.id === rawTab)) {
      return rawTab;
    }
    return availableTabs[0]?.id || 'blueprint';
  }, [availableTabs, rawTab]);

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
                  Hợp nhất mọi luồng dữ liệu thực tế (Actual Metrics) từ Blueprint SSO, file CSV và API kỹ thuật vào Chu kỳ đánh giá
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

        {/* Tab Selection Bar */}
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
                  padding: '10px 18px',
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
                    padding: '2px 7px',
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
        {activeTab === 'blueprint' && (
          <div>
            <CollectorPage />
          </div>
        )}

        {activeTab === 'jira' && (
          <div>
            <JiraCollectorPage />
          </div>
        )}

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
              <ImportUploadPage />
            )}
          </div>
        )}

        {activeTab === 'api' && (
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
                  Không có quyền truy cập kênh JSON / Evidence
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: TYPOGRAPHY.fontSize.sm, color: '#64748b' }}>
                  Tính năng tích hợp API và bằng chứng kỹ thuật dành cho HR Admin và System Admin.
                </p>
              </div>
            ) : (
              <EvaluationDataImportPage />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <ImportHistoryPage />
          </div>
        )}
      </div>
    </div>
  );
};
