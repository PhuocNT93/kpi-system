import { useState } from 'react';
import { OrgStructureTab } from '../components/OrgStructureTab';
import { JobArchitectureTab } from '../components/JobArchitectureTab';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

type Tab = 'structure' | 'architecture';

export function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('structure');
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();

  const tabStyle = (tab: Tab): React.CSSProperties => {
    const isActive = activeTab === tab;
    return {
      padding: '10px 20px',
      minHeight: '40px',
      borderRadius: '6px 6px 0 0',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '0.875rem',
      backgroundColor: isActive ? (isDark ? '#1e293b' : '#fff') : 'transparent',
      color: isActive ? (isDark ? '#a5b4fc' : '#4f46e5') : (isDark ? '#94a3b8' : '#6b7280'),
      borderBottom: isActive ? `2px solid ${isDark ? '#818cf8' : '#4f46e5'}` : '2px solid transparent',
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap',
    };
  };

  return (
    <main className="org-page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', fontWeight: 800, color: isDark ? '#f8fafc' : '#111827' }}>
          {t('page_title', 'Organization Management')}
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: isDark ? '#94a3b8' : '#6b7280', fontSize: '0.875rem' }}>
          {t('page_subtitle', 'Manage your organization structure and job architecture.')}
        </p>
      </div>

      <div
        className="org-tabs-bar"
        style={{
          borderBottom: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
        }}
      >
        <button style={tabStyle('structure')} onClick={() => setActiveTab('structure')}>
          {t('tab_org_structure', 'Org Structure')}
        </button>
        <button style={tabStyle('architecture')} onClick={() => setActiveTab('architecture')}>
          {t('tab_job_architecture', 'Job Architecture')}
        </button>
      </div>

      {activeTab === 'structure' && <OrgStructureTab />}
      {activeTab === 'architecture' && <JobArchitectureTab />}
    </main>
  );
}
