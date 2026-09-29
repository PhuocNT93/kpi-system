import { useState } from 'react';
import { OrgStructureTab } from '../components/OrgStructureTab';
import { JobArchitectureTab } from '../components/JobArchitectureTab';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';
import { Network, Briefcase } from 'lucide-react';

type Tab = 'structure' | 'architecture';

export function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('structure');
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();

  return (
    <main className="org-page-container" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Sub-header & Tab Switcher Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 700,
              color: isDark ? '#f8fafc' : '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{t('org_page_title', 'Cơ cấu Tổ chức & Quản trị Chức danh')}</span>
          </h2>
          <p
            style={{
              margin: '3px 0 0',
              color: isDark ? '#94a3b8' : '#64748b',
              fontSize: '0.8125rem',
            }}
          >
            {t(
              'org_page_subtitle',
              'Quản trị phân cấp phòng ban, cấu trúc đội nhóm, danh mục chức danh và chu kỳ đánh giá hiệu suất'
            )}
          </p>
        </div>

        {/* Modern Segmented Sub-Tab Switcher */}
        <div
          role="tablist"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px',
            backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
            borderRadius: '10px',
            border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'structure'}
            onClick={() => setActiveTab('structure')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'structure' ? 700 : 500,
              fontSize: '0.8125rem',
              backgroundColor: activeTab === 'structure' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
              color: activeTab === 'structure' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
              boxShadow: activeTab === 'structure' ? (isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)') : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Network size={15} />
            <span>{t('tab_org_structure', 'Sơ đồ tổ chức')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'architecture'}
            onClick={() => setActiveTab('architecture')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'architecture' ? 700 : 500,
              fontSize: '0.8125rem',
              backgroundColor: activeTab === 'architecture' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
              color: activeTab === 'architecture' ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b'),
              boxShadow: activeTab === 'architecture' ? (isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)') : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Briefcase size={15} />
            <span>{t('tab_job_architecture', 'Kiến trúc chức danh')}</span>
          </button>
        </div>
      </div>

      <div style={{ marginTop: '4px' }}>
        {activeTab === 'structure' && <OrgStructureTab />}
        {activeTab === 'architecture' && <JobArchitectureTab />}
      </div>
    </main>
  );
}
