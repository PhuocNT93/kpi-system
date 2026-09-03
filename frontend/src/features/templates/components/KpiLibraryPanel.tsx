import { useState } from 'react';
import { useKpisQuery } from '../../kpi/api/use-kpi';
import type { Kpi } from '../../kpi/api/kpi-api';

interface KpiLibraryPanelProps {
  existingKpiIds: Set<string>;
  onAddKpi: (kpi: Kpi) => void;
  isReadOnly?: boolean;
}

export function KpiLibraryPanel({
  existingKpiIds,
  onAddKpi,
  isReadOnly = false,
}: KpiLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const { data: kpiPage, isLoading } = useKpisQuery({ search });

  const kpis = kpiPage?.items || [];
  const filteredKpis = kpis.filter((kpi) => {
    return kpi.code !== 'LEGACY_KPI'; // Hide the auto-generated legacy KPI
  });

  return (
    <div
      style={{
        width: 320,
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>
          KPI LIBRARY
        </h3>

        {/* Search */}
        <input
          type="text"
          placeholder="Search KPIs by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.45rem 0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: '0.8125rem',
            marginBottom: '0.5rem',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {isLoading ? (
          <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', marginTop: '2rem' }}>
            Loading KPIs...
          </div>
        ) : filteredKpis.length === 0 ? (
          <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', marginTop: '2rem' }}>
            No KPIs found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredKpis.map((kpi) => {
              const isAdded = existingKpiIds.has(kpi.kpiId);
              return (
                <div
                  key={kpi.kpiId}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: isAdded ? '#f9fafb' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.1rem' }}>
                      {kpi.code}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                      {kpi.name}
                    </div>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      disabled={isAdded}
                      onClick={() => onAddKpi(kpi)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: isAdded ? '#9ca3af' : '#2563eb',
                        background: isAdded ? '#f3f4f6' : '#eff6ff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: isAdded ? 'not-allowed' : 'pointer',
                        alignSelf: 'flex-start',
                      }}
                    >
                      {isAdded ? 'Added' : '+ Add to Template'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
