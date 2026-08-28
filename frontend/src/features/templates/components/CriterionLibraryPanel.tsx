import { useState } from 'react';
import type { Criterion } from '../domain/template-models';

interface CriterionLibraryPanelProps {
  criteria: Criterion[];
  existingCriterionIds: Set<string>;
  isReadOnly?: boolean;
}

export function CriterionLibraryPanel({
  criteria,
  existingCriterionIds,
  isReadOnly = false,
}: CriterionLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

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
        {filteredCriteria.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6b7280', fontSize: '0.8125rem' }}>
            No criteria match your query.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredCriteria.map((c) => {
              const isAdded = existingCriterionIds.has(c.id);
              return (
                <div
                  key={c.id}
                  draggable={!isAdded && !isReadOnly}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(c));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '0.75rem',
                    background: isAdded ? '#f3f4f6' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    cursor: (isAdded || isReadOnly) ? 'default' : 'grab',
                    opacity: isAdded ? 0.6 : 1,
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

                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {c.currentVersion ? `v${c.currentVersion.versionNo}` : '-'} · {c.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    {!isAdded && !isReadOnly && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.875rem' }}>⠿</span> Drag to add
                      </div>
                    )}
                    <div style={{ marginLeft: 'auto' }}>
                      {isAdded && (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                          ✓ Already added
                        </span>
                      )}
                    </div>
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
