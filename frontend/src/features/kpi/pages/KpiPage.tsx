import { useState } from 'react';
import { useKpisQuery, useKpiRelationshipsQuery } from '../api/use-kpi';
import type { Kpi } from '../api/kpi-api';
import { KpiTable } from '../components/KpiTable';
import { KpiFormModal } from '../components/KpiFormModal';
import { KpiCriteriaPanel } from '../components/KpiCriteriaPanel';
import { KpiRelationshipTable } from '../components/KpiRelationshipTable';
import { AddRelationshipModal } from '../components/AddRelationshipModal';
import { LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { useTheme } from '../../../shared/theme';
import { useUiTranslation } from '../../../shared/i18n/ui-i18n';

type Tab = 'library' | 'relationships';

export function KpiPage() {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);

  const kpisQuery = useKpisQuery(searchTerm ? { search: searchTerm } : undefined);
  const relationshipsQuery = useKpiRelationshipsQuery();

  const kpis = kpisQuery.data?.items ?? [];
  const relationships = relationshipsQuery.data ?? [];

  // Build a map for fast lookup by ID
  const kpisById = new Map(kpis.map((k) => [k.kpiId, k]));

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '8px 20px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
    backgroundColor: activeTab === tab ? (isDark ? '#1f2937' : '#fff') : 'transparent',
    color: activeTab === tab ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#9ca3af' : '#6b7280'),
    borderBottom: activeTab === tab ? `2px solid ${isDark ? '#818cf8' : '#4f46e5'}` : '2px solid transparent',
  });

  return (
    <div style={{ padding: 'clamp(1rem, 2vw, 2rem)', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)', fontWeight: 800, color: isDark ? '#f8fafc' : '#111827' }}>
            {t('kpi_library_title', 'KPI Library')}
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: isDark ? '#94a3b8' : '#6b7280', fontSize: '0.875rem' }}>
            {t('kpi_library_desc', 'Manage KPIs and their dependency relationships.')}
          </p>
        </div>
        {activeTab === 'library' && (
          <Button onClick={() => setIsCreateOpen(true)}>
            {t('create_kpi', '+ Create KPI')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, marginBottom: '1.5rem', overflowX: 'auto' }}>
        <button style={tabStyle('library')} onClick={() => setActiveTab('library')}>
          {t('kpi_library_tab', 'KPI Library')} {kpisQuery.data ? `(${kpisQuery.data.total})` : ''}
        </button>
        <button style={tabStyle('relationships')} onClick={() => setActiveTab('relationships')}>
          {t('kpi_dependency_map_tab', 'Dependency Map')} {relationships.length > 0 ? `(${relationships.length})` : ''}
        </button>
      </div>

      {/* Tab: KPI Library */}
      {activeTab === 'library' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder={t('search_kpi_placeholder', 'Search by code or name...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                maxWidth: 400,
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                color: isDark ? '#f8fafc' : '#111827',
                outline: 'none',
              }}
            />
          </div>

          {kpisQuery.isLoading && <LoadingSpinner label="Loading KPIs..." />}
          {kpisQuery.error && <ErrorAlert error={kpisQuery.error} />}
          {!kpisQuery.isLoading && !kpisQuery.error && (
            <>
              <KpiTable
                kpis={kpis}
                onEdit={(kpi) => setEditingKpi(kpi)}
                onSelect={(kpi) => setSelectedKpi(kpi)}
                selectedKpiId={selectedKpi?.kpiId}
              />
              {selectedKpi && (
                <div style={{ marginTop: '1.5rem', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                  <KpiCriteriaPanel kpi={selectedKpi} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tab: Dependency Map */}
      {activeTab === 'relationships' && (
        <>
          {relationshipsQuery.isLoading && <LoadingSpinner label="Loading relationships..." />}
          {relationshipsQuery.error && <ErrorAlert error={relationshipsQuery.error} />}
          {!relationshipsQuery.isLoading && !relationshipsQuery.error && (
            <KpiRelationshipTable
              relationships={relationships}
              kpisById={kpisById}
              onAddRelationship={() => setIsRelationshipModalOpen(true)}
            />
          )}
        </>
      )}

      {/* Modals */}
      <KpiFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <KpiFormModal
        isOpen={Boolean(editingKpi)}
        onClose={() => setEditingKpi(null)}
        editingKpi={editingKpi}
      />
      <AddRelationshipModal
        isOpen={isRelationshipModalOpen}
        onClose={() => setIsRelationshipModalOpen(false)}
        kpis={kpis}
      />
    </div>
  );
}
