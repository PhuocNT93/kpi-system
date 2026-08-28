import React from 'react';
import type { TemplateKpi, TemplateKpiCriterion } from '../domain/template-models';
import { ProvenancePopover } from './ProvenancePopover';
import { Button } from '../../../shared/ui/Button/Button';

interface SelectedKpiCanvasProps {
  kpis: TemplateKpi[];
  onKpiWeightChange: (kpiId: string, newWeight: number) => void;
  onRemoveKpi: (kpiId: string) => void;
  onCriterionWeightChange: (kpiId: string, criterionId: string, newWeight: number) => void;
  onRemoveCriterion: (kpiId: string, criterionId: string) => void;
  onConfigureCriterionClick: (kpiId: string, criterion: TemplateKpiCriterion) => void;
  onCriterionDrop: (kpiId: string, criterion: any) => void;
  isReadOnly?: boolean;
}

export function SelectedKpiCanvas({
  kpis,
  onKpiWeightChange,
  onRemoveKpi,
  onCriterionWeightChange,
  onRemoveCriterion,
  onConfigureCriterionClick,
  onCriterionDrop,
  isReadOnly = false,
}: SelectedKpiCanvasProps) {
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
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#9ca3af' }}>📋</div>
        <h3 style={{ margin: '0 0 0.5rem', color: '#374151', fontSize: '1.125rem' }}>
          No KPIs added yet
        </h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', textAlign: 'center' }}>
          Start building your evaluation framework by adding a KPI from the top.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {kpis.map((kpi, kpiIndex) => (
        <div
          key={kpi.id || kpi.kpiId}
          onDragOver={(e) => {
            if (!isReadOnly) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }
          }}
          onDrop={(e) => {
            if (isReadOnly) return;
            e.preventDefault();
            try {
              const data = e.dataTransfer.getData('application/json');
              if (data) {
                const criterion = JSON.parse(data);
                onCriterionDrop(kpi.id, criterion);
              }
            } catch (err) {
              console.error('Failed to parse dropped criterion', err);
            }
          }}
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* KPI Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#111827',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
              >
                {kpiIndex + 1}
              </span>
              <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#111827' }}>
                {kpi.kpiName}
              </h4>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4b5563' }}>KPI Weight:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="number"
                    value={kpi.weight}
                    disabled={isReadOnly}
                    onChange={(e) => onKpiWeightChange(kpi.id, parseFloat(e.target.value) || 0)}
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
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => onRemoveKpi(kpi.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Remove KPI
                </button>
              )}
            </div>
          </div>

          {/* Criteria List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {kpi.criteria.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', background: '#f9fafb', borderRadius: 6, border: '1px dashed #d1d5db' }}>
                No criteria added to this KPI yet. Drag and drop from the library.
              </div>
            ) : (
              kpi.criteria.map((item, index) => {
                const ruleName =
                  item.customScoringRule?.ruleType ||
                  item.criterion.currentVersion?.scoringRule?.ruleType ||
                  'Range Threshold';

                let applicabilitySummary = 'Applies to: All employees';
                if (item.applicableRoleIds?.length || item.applicableTeamIds?.length) {
                  applicabilitySummary = `Applies to: ${item.applicableRoleIds?.length || 0} Roles, ${
                    item.applicableTeamIds?.length || 0
                  } Teams`;
                }

                return (
                  <div
                    key={item.id || item.criterion.id + index}
                    style={{
                      background: '#fafafa',
                      border: item.isDisabled ? '1px dashed #d1d5db' : '1px solid #e5e7eb',
                      borderRadius: 6,
                      padding: '1rem',
                      opacity: item.isDisabled ? 0.6 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.625rem',
                    }}
                  >
                    {/* Card Top Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#2563eb',
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827' }}>
                            {item.criterion.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {item.criterion.category} · {ruleName}
                          </div>
                        </div>
                      </div>

                      {/* Direct Inline Weight Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input
                            type="number"
                            value={item.effectiveWeight}
                            disabled={isReadOnly}
                            onChange={(e) => onCriterionWeightChange(kpi.id, item.id, parseFloat(e.target.value) || 0)}
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

                        <ProvenancePopover
                          provenance={item.provenance}
                          criterionName={item.criterion.name}
                          configuredWeight={item.effectiveWeight}
                        />
                      </div>
                    </div>

                    {/* Card Middle Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          background: item.isOptional ? '#fef3c7' : '#d1fae5',
                          color: item.isOptional ? '#92400e' : '#065f46',
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: 12,
                          fontWeight: 600,
                        }}
                      >
                        {item.isOptional ? 'Optional' : 'Required'}
                      </span>

                      <span
                        style={{
                          background: '#e5e7eb',
                          color: '#4b5563',
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: 12,
                          fontWeight: 500,
                        }}
                      >
                        {applicabilitySummary}
                      </span>
                    </div>

                    {/* Card Footer Actions */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid #e5e7eb',
                        paddingTop: '0.5rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      <Button
                        size="sm"
                        variant="outlined"
                        onClick={() => onConfigureCriterionClick(kpi.id, item)}
                      >
                        ⚙ Configure Rule & Scope
                      </Button>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => onRemoveCriterion(kpi.id, item.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#ef4444',
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
