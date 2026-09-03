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

type Tab = 'library' | 'relationships';

export function KpiPage() {
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
    backgroundColor: activeTab === tab ? '#fff' : 'transparent',
    color: activeTab === tab ? '#4f46e5' : '#6b7280',
    borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
  });

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
            KPI Library
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Manage KPIs and their dependency relationships.
          </p>
        </div>
        {activeTab === 'library' && (
          <Button onClick={() => setIsCreateOpen(true)}>
            + Create KPI
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <button style={tabStyle('library')} onClick={() => setActiveTab('library')}>
          KPI Library {kpisQuery.data ? `(${kpisQuery.data.total})` : ''}
        </button>
        <button style={tabStyle('relationships')} onClick={() => setActiveTab('relationships')}>
          Dependency Map {relationships.length > 0 ? `(${relationships.length})` : ''}
        </button>
      </div>

      {/* Tab: KPI Library */}
      {activeTab === 'library' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', maxWidth: 400, padding: '0.5rem 0.75rem',
                borderRadius: 6, border: '1px solid #d1d5db', outline: 'none',
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
                onDeleteSuccess={(id) => {
                  if (selectedKpi?.kpiId === id) setSelectedKpi(null);
                }}
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
