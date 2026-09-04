import { useState } from 'react';
import { OrgStructureTab } from '../components/OrgStructureTab';
import { JobArchitectureTab } from '../components/JobArchitectureTab';

type Tab = 'structure' | 'architecture';

export function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('structure');

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '8px 20px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
    backgroundColor: activeTab === tab ? '#fff' : 'transparent',
    color: activeTab === tab ? '#4f46e5' : '#6b7280',
    borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
  });

  return (
    <main style={{ padding: '2rem', width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
          Organization Management
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
          Manage your organization structure and job architecture.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <button style={tabStyle('structure')} onClick={() => setActiveTab('structure')}>
          Org Structure
        </button>
        <button style={tabStyle('architecture')} onClick={() => setActiveTab('architecture')}>
          Job Architecture
        </button>
      </div>

      {activeTab === 'structure' && <OrgStructureTab />}
      {activeTab === 'architecture' && <JobArchitectureTab />}
    </main>
  );
}
