import { useMemo, useState } from 'react';
import type { Criterion } from '../domain/template-models';
import { useKpisQuery } from '../../kpi/api/use-kpi';
import { useQueries } from '@tanstack/react-query';
import { fetchKpiCriteria, type KpiCriterionMapping, type Kpi } from '../../kpi/api/kpi-api';

interface CriterionLibraryPanelProps {
  criteria: Criterion[];
  existingCriterionIds: Set<string>;
  onAddCriterion: (criterion: Criterion, kpiId?: string) => void;
  isReadOnly?: boolean;
}

export function CriterionLibraryPanel({
  criteria,
  existingCriterionIds,
  onAddCriterion,
  isReadOnly = false,
}: CriterionLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const { data: kpiPage, isLoading: isLoadingKpis } = useKpisQuery({ search: '' });
  const kpis = kpiPage?.items || [];
  const kpiCriteriaQueries = useQueries({
    queries: kpis.map((kpi) => ({
      queryKey: ['templates', 'kpi-criteria', kpi.kpiId] as const,
      queryFn: () => fetchKpiCriteria(kpi.kpiId),
      enabled: Boolean(kpi.kpiId),
    })),
  });

  const mappingsByCriterionId = useMemo(() => {
    const map = new Map<string, Array<{ kpi: Kpi; mapping: KpiCriterionMapping }>>();
    kpiCriteriaQueries.forEach((query, index) => {
      const kpi = kpis[index];
      const mappings = (query.data || []) as KpiCriterionMapping[];
      if (!kpi) return;
      mappings.forEach((mapping) => {
        const bucket = map.get(mapping.criterionId) || [];
        bucket.push({ kpi, mapping });
        map.set(mapping.criterionId, bucket);
      });
    });
    return map;
  }, [kpiCriteriaQueries, kpis]);

  const categories = Array.from(new Set(criteria.map((c) => c.category)));

  const filteredCriteria = criteria.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
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
          CRITERION LIBRARY
        </h3>

        {/* Search */}
        <input
          type="text"
          placeholder="Search criteria by name or code..."
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

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: 12,
              border: '1px solid #d1d5db',
              background: selectedCategory === 'ALL' ? '#2563eb' : '#f3f4f6',
              color: selectedCategory === 'ALL' ? '#ffffff' : '#374151',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: 12,
                border: '1px solid #d1d5db',
                background: selectedCategory === cat ? '#2563eb' : '#f3f4f6',
                color: selectedCategory === cat ? '#ffffff' : '#374151',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Criteria Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {isLoadingKpis ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6b7280', fontSize: '0.8125rem' }}>
            Loading KPI relationships...
          </div>
        ) : filteredCriteria.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6b7280', fontSize: '0.8125rem' }}>
            No criteria match your query.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredCriteria.map((c) => {
              const isAdded = existingCriterionIds.has(c.id);
              const linkedKpis = mappingsByCriterionId.get(c.id) || [];
              return (
                <div
                  key={c.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '0.75rem',
                    background: isAdded ? '#f3f4f6' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    opacity: isAdded ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>
                      {c.name}
                    </div>
                    <span
                      style={{
                        background: '#e0e7ff',
                        color: '#3730a3',
                        fontSize: '0.6875rem',
                        padding: '0.1rem 0.375rem',
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      {c.category}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span>v{c.version} · Published</span>
                    <span>
                      KPI count: {linkedKpis.length}
                    </span>
                  </div>

                  {linkedKpis.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {linkedKpis.slice(0, 4).map(({ kpi }) => (
                        <span
                          key={kpi.kpiId}
                          style={{
                            fontSize: '0.6875rem',
                            padding: '0.1rem 0.375rem',
                            borderRadius: 999,
                            background: '#ecfeff',
                            color: '#0f766e',
                            border: '1px solid #a5f3fc',
                          }}
                        >
                          {kpi.code}
                        </span>
                      ))}
                      {linkedKpis.length > 4 && (
                        <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                          +{linkedKpis.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {isAdded ? (
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                        ✓ Already added
                      </span>
                    ) : (
                      !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => onAddCriterion(c)}
                          style={{
                            border: 'none',
                            background: '#eff6ff',
                            color: '#2563eb',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: 6,
                            padding: '0.35rem 0.7rem',
                            cursor: 'pointer',
                          }}
                        >
                          + Add Criterion
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
