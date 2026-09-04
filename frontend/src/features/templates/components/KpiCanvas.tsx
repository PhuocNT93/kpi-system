import { useState } from 'react';
import type { TemplateKpi, TemplateCriterion } from '../domain/template-models';
import { SelectedCriteriaCanvas } from './SelectedCriteriaCanvas';
import { Button } from '../../../shared/ui/Button/Button';

interface KpiCanvasProps {
  kpis: TemplateKpi[];
  criteria: TemplateCriterion[];
  onWeightChange: (id: string, newWeight: number) => void;
  onRemoveCriterion: (id: string) => void;
  onConfigureClick: (criterion: TemplateCriterion) => void;
  onReorder: (dragIndex: number, dropIndex: number) => void;
  onRemoveKpi: (kpiId: string) => void;
  selectedKpiId?: string | null;
  onSelectKpi?: (kpiId: string) => void;
  onKpiWeightChange?: (kpiId: string, newWeight: number) => void;
  isReadOnly?: boolean;
}

export function KpiCanvas({
  kpis,
  criteria,
  onWeightChange,
  onRemoveCriterion,
  onConfigureClick,
  onReorder,
  onRemoveKpi,
  selectedKpiId,
  onSelectKpi,
  onKpiWeightChange,
  isReadOnly = false,
}: KpiCanvasProps) {
  const [expandedKpiIds, setExpandedKpiIds] = useState<Set<string>>(new Set(kpis.map(k => k.id)));

  const toggleKpi = (id: string) => {
    setExpandedKpiIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (kpis.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          border: '2px dashed #d1d5db',
          borderRadius: 8,
          background: '#ffffff',
          margin: '1.5rem',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#9ca3af' }}>📊</div>
        <h3 style={{ margin: '0 0 0.5rem', color: '#374151', fontSize: '1.125rem' }}>
          No KPIs added yet
        </h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', textAlign: 'center' }}>
          Start by adding a KPI from the KPI library on the left.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
      {kpis.map((kpi, index) => {
        const kpiCriteria = criteria.filter(c => c.templateKpiId === kpi.id);
        const isExpanded = expandedKpiIds.has(kpi.id);
        
        return (
          <div
            key={kpi.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* KPI Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                backgroundColor: selectedKpiId === kpi.id ? '#eff6ff' : '#f9fafb',
                borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                borderLeft: selectedKpiId === kpi.id ? '4px solid #2563eb' : '4px solid transparent',
                cursor: 'pointer',
              }}
              onClick={() => {
                toggleKpi(kpi.id);
                if (onSelectKpi) onSelectKpi(kpi.id);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.25rem', color: '#6b7280' }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#4f46e5',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                    {(kpi.kpi as { name?: string })?.name || 'Unknown KPI'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {kpiCriteria.length} Criteria · Weight: {kpi.weight}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="number"
                    value={kpi.weight}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      if (onKpiWeightChange) {
                        onKpiWeightChange(kpi.id, parseFloat(e.target.value) || 0);
                      }
                    }}
                    style={{
                      width: 64,
                      padding: '0.35rem 0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151' }}>%</span>
                </div>
                {!isReadOnly && (
                  <Button variant="secondary" size="sm" onClick={() => onRemoveKpi(kpi.id)}>
                    Remove KPI
                  </Button>
                )}
              </div>
            </div>

            {/* KPI Content (Criteria) */}
            {isExpanded && (
              <div style={{ padding: '1rem 1.5rem', backgroundColor: '#ffffff' }}>
                {/* Note: In a real implementation, you might want to pass only this KPI's criteria to the canvas, 
                    and handle reordering within the KPI scope. */}
                <SelectedCriteriaCanvas
                  criteria={kpiCriteria}
                  onWeightChange={onWeightChange}
                  onRemoveCriterion={onRemoveCriterion}
                  onConfigureClick={onConfigureClick}
                  onReorder={onReorder}
                  isReadOnly={isReadOnly}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
