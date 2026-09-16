import React, { useState } from 'react';
import type { RelationshipTuple, EmployeeInfo, EvaluationInfo, KpiItem } from '../types/kpi-summary.types';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { Network, Table as TableIcon, ArrowRight, Building, Users, Calendar, Award, CheckCircle } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'visual' | 'accessible'>('visual');

  // Build a lookup of entities by stable ID
  const entityMap = new Map<string, { label: string; type: string }>();
  entityMap.set(employee.employeeId, { label: resolveLocalizedText(employee.fullName), type: 'Employee' });
  if (employee.team) entityMap.set(employee.team.teamId, { label: resolveLocalizedText(employee.team.name), type: 'Team' });
  if (employee.department) entityMap.set(employee.department.departmentId, { label: resolveLocalizedText(employee.department.name), type: 'Department' });
  if (employee.manager) entityMap.set(employee.manager.employeeId, { label: resolveLocalizedText(employee.manager.fullName), type: 'Manager' });
  entityMap.set(evaluation.evaluationId, { label: `Evaluation (${evaluation.status})`, type: 'Evaluation' });
  entityMap.set(evaluation.evaluationCycleId, { label: resolveLocalizedText(evaluation.cycleName), type: 'Cycle' });

  kpis.forEach((k) => {
    entityMap.set(k.evaluationItemId, { label: resolveLocalizedText(k.criterionName), type: 'KPI' });
  });

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={18} style={{ color: 'var(--primary, #3b82f6)' }} />
            Organizational & Evaluation Relationship Diagram
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Rendered directly from backend entity relationships ({relationships.length} graph edges)
          </p>
        </div>

        {/* View mode toggle */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: 'var(--bg-muted, rgba(0,0,0,0.05))',
            borderRadius: '8px',
            padding: '2px',
          }}
        >
          <button
            onClick={() => setViewMode('visual')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewMode === 'visual' ? 'var(--bg-surface, #fff)' : 'transparent',
              color: viewMode === 'visual' ? 'var(--primary, #3b82f6)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: viewMode === 'visual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
            aria-pressed={viewMode === 'visual'}
          >
            <Network size={14} /> Graphical DAG
          </button>
          <button
            onClick={() => setViewMode('accessible')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewMode === 'accessible' ? 'var(--bg-surface, #fff)' : 'transparent',
              color: viewMode === 'accessible' ? 'var(--primary, #3b82f6)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: viewMode === 'accessible' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
            aria-pressed={viewMode === 'accessible'}
            aria-label="Accessible table view"
          >
            <TableIcon size={14} /> Accessible List
          </button>
        </div>
      </div>

      {/* Graphical Node View */}
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
            {/* Top Level: Organization Context */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
              {employee.department && (
                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Building size={16} style={{ color: '#2563eb' }} />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Department</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{resolveLocalizedText(employee.department.name)}</div>
                  </div>
                </div>
              )}

              {employee.department && employee.team && <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />}

              {employee.team && (
                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Users size={16} style={{ color: '#059669' }} />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Team</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{resolveLocalizedText(employee.team.name)}</div>
                  </div>
                </div>
              )}

              {employee.manager && (
                <>
                  <div style={{ width: '20px' }} />
                  <div
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      backgroundColor: 'rgba(245, 158, 11, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Award size={16} style={{ color: '#d97706' }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Manager</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{resolveLocalizedText(employee.manager.fullName)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Middle Level: Employee Core Node */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  border: '2px solid var(--primary, #3b82f6)',
                  borderRadius: '10px',
                  padding: '14px 24px',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
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
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary, #3b82f6)', textTransform: 'uppercase' }}>
                    Target Employee
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {resolveLocalizedText(employee.fullName)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {resolveLocalizedText(employee.employeeCode)}
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluation Node */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'rgba(139, 92, 246, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Calendar size={16} style={{ color: '#7c3aed' }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Cycle</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{resolveLocalizedText(evaluation.cycleName)}</div>
                </div>
              </div>

              <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />

              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle size={16} style={{ color: '#059669' }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Evaluation</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Status: {evaluation.status}</div>
                </div>
              </div>
            </div>

            {/* Bottom Level: Evaluated Criteria Nodes */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '10px' }}>
                Evaluated Criteria ({kpis.length})
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
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      backgroundColor: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--primary, #3b82f6)' }}>
                      #{kpi.displayOrder}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {resolveLocalizedText(kpi.criterionName)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>({kpi.weight}%)</span>
                  </div>
                ))}
                {kpis.length > 10 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                    +{kpis.length - 10} more criteria
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible Table Representation */
        <div style={{ padding: '16px 20px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 12px' }}>Source Entity</th>
                <th style={{ padding: '10px 12px' }}>Relationship Type</th>
                <th style={{ padding: '10px 12px' }}>Target Entity</th>
                <th style={{ padding: '10px 12px' }}>Source ID</th>
                <th style={{ padding: '10px 12px' }}>Target ID</th>
              </tr>
            </thead>
            <tbody>
              {relationships.map((rel, idx) => {
                const sourceMeta = entityMap.get(rel.sourceId);
                const targetMeta = entityMap.get(rel.targetId);

                return (
                  <tr key={`${rel.sourceId}-${rel.targetId}-${idx}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sourceMeta ? `${sourceMeta.label} (${sourceMeta.type})` : rel.sourceId}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: 'var(--primary, #3b82f6)',
                        }}
                      >
                        {rel.relationshipType}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {targetMeta ? `${targetMeta.label} (${targetMeta.type})` : rel.targetId}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {rel.sourceId.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {rel.targetId.substring(0, 8)}...
                    </td>
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
