import React, { useState } from 'react';
import type { RelationshipTuple, EmployeeInfo, EvaluationInfo, KpiItem } from '../types/kpi-summary.types';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useReportPalette, type ReportTone } from '../../hooks/use-report-palette';
import { Network, Table as TableIcon, ArrowRight, Building, Users, Calendar, Award, CheckCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KpiRelationshipDiagramProps {
  employee: EmployeeInfo;
  evaluation: EvaluationInfo;
  kpis: KpiItem[];
  relationships: RelationshipTuple[];
}

export const KpiRelationshipDiagram: React.FC<KpiRelationshipDiagramProps> = ({
  employee,
  evaluation,
  kpis,
  relationships,
}) => {
  const { t } = useUiTranslation();
  const palette = useReportPalette();
  const [viewMode, setViewMode] = useState<'visual' | 'accessible'>('visual');

  const entityTypeLabels = {
    employee: t('reports.summary.entity_employee', 'Employee'),
    team: t('reports.summary.entity_team', 'Team'),
    department: t('reports.summary.entity_department', 'Department'),
    manager: t('reports.summary.entity_manager', 'Manager'),
    evaluation: t('reports.summary.entity_evaluation', 'Evaluation'),
    cycle: t('reports.summary.entity_cycle', 'Cycle'),
    kpi: t('reports.summary.entity_kpi', 'KPI'),
  };

  // Build a lookup of entities by stable ID
  const entityMap = new Map<string, { label: string; type: string }>();
  entityMap.set(employee.employeeId, { label: resolveLocalizedText(employee.fullName), type: entityTypeLabels.employee });
  if (employee.team) entityMap.set(employee.team.teamId, { label: resolveLocalizedText(employee.team.name), type: entityTypeLabels.team });
  if (employee.department) entityMap.set(employee.department.departmentId, { label: resolveLocalizedText(employee.department.name), type: entityTypeLabels.department });
  if (employee.manager) entityMap.set(employee.manager.employeeId, { label: resolveLocalizedText(employee.manager.fullName), type: entityTypeLabels.manager });
  entityMap.set(evaluation.evaluationId, {
    label: t('reports.summary.evaluation_with_status', 'Evaluation ({status})', { status: evaluation.status }),
    type: entityTypeLabels.evaluation,
  });
  entityMap.set(evaluation.evaluationCycleId, { label: resolveLocalizedText(evaluation.cycleName), type: entityTypeLabels.cycle });

  kpis.forEach((k) => {
    entityMap.set(k.evaluationItemId, { label: resolveLocalizedText(k.criterionName), type: entityTypeLabels.kpi });
  });

  const toggleButtonStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: isActive ? palette.surface : 'transparent',
    color: isActive ? palette.tones.info.fg : palette.textSecondary,
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
    boxShadow: isActive ? palette.shadow : 'none',
  });

  const renderContextNode = (Icon: LucideIcon, tone: ReportTone, typeLabel: string, value: string) => (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: '8px',
        padding: '10px 16px',
        backgroundColor: palette.tones[tone].bg,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Icon size={16} style={{ color: palette.tones[tone].fg }} />
      <div>
        <div style={{ fontSize: '0.72rem', color: palette.textSecondary }}>{typeLabel}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: palette.textPrimary }}>{value}</div>
      </div>
    </div>
  );

  const headerCellStyle: React.CSSProperties = { padding: '10px 12px' };
  const idCellStyle: React.CSSProperties = {
    padding: '10px 12px',
    color: palette.textSecondary,
    fontSize: '0.75rem',
    fontFamily: 'monospace',
  };

  return (
    <div
      style={{
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: palette.shadow,
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${palette.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: palette.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={18} style={{ color: palette.tones.info.fg }} />
            {t('reports.summary.relationship_diagram_title', 'Organizational & Evaluation Relationship Diagram')}
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: palette.textSecondary }}>
            {t(
              'reports.summary.relationship_diagram_description',
              'Rendered directly from backend entity relationships ({count} graph edges)',
              { count: relationships.length }
            )}
          </p>
        </div>

        <div
          style={{
            display: 'inline-flex',
            backgroundColor: palette.surfaceMuted,
            border: `1px solid ${palette.border}`,
            borderRadius: '8px',
            padding: '2px',
          }}
        >
          <button
            onClick={() => setViewMode('visual')}
            style={toggleButtonStyle(viewMode === 'visual')}
            aria-pressed={viewMode === 'visual'}
          >
            <Network size={14} /> {t('reports.summary.view_graphical', 'Graphical DAG')}
          </button>
          <button
            onClick={() => setViewMode('accessible')}
            style={toggleButtonStyle(viewMode === 'accessible')}
            aria-pressed={viewMode === 'accessible'}
            aria-label={t('reports.summary.view_accessible_aria', 'Accessible table view')}
          >
            <TableIcon size={14} /> {t('reports.summary.view_accessible', 'Accessible List')}
          </button>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <div style={{ padding: '24px', overflowX: 'auto' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              minWidth: '600px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
              {employee.department &&
                renderContextNode(Building, 'info', entityTypeLabels.department, resolveLocalizedText(employee.department.name))}

              {employee.department && employee.team && <ArrowRight size={16} style={{ color: palette.textSecondary }} />}

              {employee.team &&
                renderContextNode(Users, 'success', entityTypeLabels.team, resolveLocalizedText(employee.team.name))}

              {employee.manager && (
                <>
                  <div style={{ width: '20px' }} />
                  {renderContextNode(Award, 'warning', entityTypeLabels.manager, resolveLocalizedText(employee.manager.fullName))}
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  border: '2px solid var(--primary, #3b82f6)',
                  borderRadius: '10px',
                  padding: '14px 24px',
                  backgroundColor: palette.tones.info.bg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary, #3b82f6)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {resolveLocalizedText(employee.fullName).charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: palette.tones.info.fg, textTransform: 'uppercase' }}>
                    {t('reports.summary.target_employee', 'Target Employee')}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: palette.textPrimary }}>
                    {resolveLocalizedText(employee.fullName)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: palette.textSecondary }}>
                    {resolveLocalizedText(employee.employeeCode)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
              {renderContextNode(Calendar, 'primary', entityTypeLabels.cycle, resolveLocalizedText(evaluation.cycleName))}

              <ArrowRight size={16} style={{ color: palette.textSecondary }} />

              {renderContextNode(
                CheckCircle,
                'success',
                entityTypeLabels.evaluation,
                t('reports.summary.status_value', 'Status: {status}', { status: evaluation.status })
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: palette.textSecondary, textAlign: 'center', marginBottom: '10px' }}>
                {t('reports.summary.evaluated_criteria', 'Evaluated Criteria ({count})', { count: kpis.length })}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                {kpis.slice(0, 10).map((kpi) => (
                  <div
                    key={kpi.evaluationItemId}
                    style={{
                      border: `1px solid ${palette.border}`,
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      backgroundColor: palette.surfaceSubtle,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: palette.tones.info.fg }}>
                      #{kpi.displayOrder}
                    </span>
                    <span style={{ color: palette.textPrimary, fontWeight: 500 }}>
                      {resolveLocalizedText(kpi.criterionName)}
                    </span>
                    <span style={{ color: palette.textSecondary }}>({kpi.weight}%)</span>
                  </div>
                ))}
                {kpis.length > 10 && (
                  <div style={{ fontSize: '0.78rem', color: palette.textSecondary, alignSelf: 'center' }}>
                    {t('reports.summary.more_criteria', '+{count} more criteria', { count: kpis.length - 10 })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${palette.border}`, color: palette.textSecondary }}>
                <th style={headerCellStyle}>{t('reports.summary.column_source_entity', 'Source Entity')}</th>
                <th style={headerCellStyle}>{t('reports.summary.column_relationship_type', 'Relationship Type')}</th>
                <th style={headerCellStyle}>{t('reports.summary.column_target_entity', 'Target Entity')}</th>
                <th style={headerCellStyle}>{t('reports.summary.column_source_id', 'Source ID')}</th>
                <th style={headerCellStyle}>{t('reports.summary.column_target_id', 'Target ID')}</th>
              </tr>
            </thead>
            <tbody>
              {relationships.map((rel, idx) => {
                const sourceMeta = entityMap.get(rel.sourceId);
                const targetMeta = entityMap.get(rel.targetId);

                return (
                  <tr key={`${rel.sourceId}-${rel.targetId}-${idx}`} style={{ borderBottom: `1px solid ${palette.border}` }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: palette.textPrimary }}>
                      {sourceMeta ? `${sourceMeta.label} (${sourceMeta.type})` : rel.sourceId}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: palette.tones.info.bg,
                          color: palette.tones.info.fg,
                        }}
                      >
                        {rel.relationshipType}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: palette.textPrimary }}>
                      {targetMeta ? `${targetMeta.label} (${targetMeta.type})` : rel.targetId}
                    </td>
                    <td style={idCellStyle}>{rel.sourceId.substring(0, 8)}...</td>
                    <td style={idCellStyle}>{rel.targetId.substring(0, 8)}...</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
