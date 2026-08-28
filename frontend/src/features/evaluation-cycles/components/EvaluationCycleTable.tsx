import React, { useState } from 'react';
import type { EvaluationCycleDTO } from '../types/cycle-types';
import { CycleStatusBadge } from './CycleStatusBadge';
import { Button } from '@/shared/ui/Button/Button';
import { COLORS } from '@/lib/theme';
import { RADII } from '@/shared/theme';
import { Search, Eye, Edit3, Play, Lock, Plus } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui';

interface EvaluationCycleTableProps {
  cycles: EvaluationCycleDTO[];
  isLoading?: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onOpen: (id: string) => void;
  onLock: (id: string) => void;
  onCreateNew: () => void;
  templatesOptions?: { id: string; name: string }[];
  teamsOptions?: { id: string; name: string }[];
}

export const EvaluationCycleTable: React.FC<EvaluationCycleTableProps> = ({
  cycles,
  onView,
  onEdit,
  onOpen,
  onLock,
  onCreateNew,
  templatesOptions = [],
  teamsOptions = [],
}) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');

  const filteredCycles = cycles.filter((cycle) => {
    const matchesSearch =
      !search ||
      (cycle.name && cycle.name.toLowerCase().includes(search.toLowerCase())) ||
      (cycle.code && cycle.code.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = selectedStatus === 'ALL' || cycle.status === selectedStatus;
    const matchesTemplate = selectedTemplate === 'ALL' || cycle.template?.id === selectedTemplate;
    const matchesTeam =
      selectedTeam === 'ALL' ||
      !cycle.scope?.teams ||
      cycle.scope.teams.length === 0 ||
      cycle.scope.teams.some((t) => t.id === selectedTeam);

    return matchesSearch && matchesStatus && matchesTemplate && matchesTeam;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: COLORS.neutral.white,
          padding: '16px 20px',
          borderRadius: RADII.xl,
          border: `1px solid ${COLORS.neutral[200]}`,
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
          <Search
            size={16}
            color={COLORS.neutral.textSecondary}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search cycle code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: RADII.md,
              border: `1px solid ${COLORS.neutral[300]}`,
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: RADII.md,
              border: `1px solid ${COLORS.neutral[300]}`,
              fontSize: '0.875rem',
              backgroundColor: COLORS.neutral.white,
            }}
          >
            <option value="ALL">Status: All</option>
            <option value="DRAFT">DRAFT</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="REVIEWING">REVIEWING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="LOCKED">LOCKED</option>
          </select>

          {/* Template Filter */}
          {templatesOptions.length > 0 && (
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${COLORS.neutral[300]}`,
                fontSize: '0.875rem',
                backgroundColor: COLORS.neutral.white,
              }}
            >
              <option value="ALL">Template: All</option>
              {templatesOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {/* Team Filter */}
          {teamsOptions.length > 0 && (
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${COLORS.neutral[300]}`,
                fontSize: '0.875rem',
                backgroundColor: COLORS.neutral.white,
              }}
            >
              <option value="ALL">Team: All</option>
              {teamsOptions.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>
          )}

          <Button onClick={onCreateNew}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            Create Evaluation Cycle
          </Button>
        </div>
      </div>

      {/* Table Data Container */}
      <div
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII.xl,
          border: `1px solid ${COLORS.neutral[200]}`,
          overflow: 'hidden',
        }}
      >
        {filteredCycles.length === 0 ? (
          <EmptyState message="No evaluation cycles match the selected criteria." />
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: COLORS.neutral[50],
                  borderBottom: `1px solid ${COLORS.neutral[200]}`,
                  color: COLORS.neutral.textSecondary,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '12px 16px' }}>Cycle Name / Code</th>
                <th style={{ padding: '12px 16px' }}>Template Version</th>
                <th style={{ padding: '12px 16px' }}>Period</th>
                <th style={{ padding: '12px 16px' }}>Scope (Teams / Roles)</th>
                <th style={{ padding: '12px 16px' }}>Evaluations</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCycles.map((cycle) => {
                const allowedActions = cycle.allowedActions || [];
                const canEdit = allowedActions.includes('EDIT');
                const canOpen = allowedActions.includes('OPEN');
                const canLock = allowedActions.includes('LOCK');

                const templateName = cycle.template?.name || 'Evaluation Template';
                const templateVersion = cycle.template?.version || 'v1';
                const startDate = cycle.period?.startDate || '';
                const endDate = cycle.period?.endDate || '';
                const teamsList = cycle.scope?.teams || [];
                const rolesList = cycle.scope?.roles || [];
                const generated = cycle.evaluationSummary?.generated ?? 0;
                const totalEmployees = cycle.evaluationSummary?.applicableEmployees ?? 0;

                return (
                  <tr
                    key={cycle.id}
                    style={{
                      borderBottom: `1px solid ${COLORS.neutral[200]}`,
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                        {cycle.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: COLORS.neutral.textSecondary, fontFamily: 'monospace' }}>
                        {cycle.code}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: COLORS.neutral.textPrimary, fontWeight: 500 }}>
                        {templateName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: COLORS.neutral.textSecondary }}>
                        Version {templateVersion}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: COLORS.neutral.textPrimary }}>
                      {startDate} → {endDate}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.8125rem', color: COLORS.neutral.textPrimary }}>
                        Teams: {teamsList.length > 0 ? teamsList.map((t) => t.name).join(', ') : 'All'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: COLORS.neutral.textSecondary }}>
                        Roles: {rolesList.length > 0 ? rolesList.map((r) => r.name).join(', ') : 'All'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                      {generated} / {totalEmployees}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <CycleStatusBadge status={cycle.status} />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onView(cycle.id)}
                          title="View Cycle Detail"
                        >
                          <Eye size={14} style={{ marginRight: '4px' }} />
                          View
                        </Button>

                        {canEdit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onEdit(cycle.id)}
                            title="Edit Cycle Configuration"
                          >
                            <Edit3 size={14} style={{ marginRight: '4px' }} />
                            Edit
                          </Button>
                        )}

                        {canOpen && (
                          <Button
                            size="sm"
                            onClick={() => onOpen(cycle.id)}
                            title="Open Evaluation Cycle"
                          >
                            <Play size={14} style={{ marginRight: '4px' }} />
                            Open
                          </Button>
                        )}

                        {canLock && (
                          <Button
                            variant="outlined"
                            size="sm"
                            onClick={() => onLock(cycle.id)}
                            title="Lock Cycle Read-only"
                          >
                            <Lock size={14} style={{ marginRight: '4px' }} />
                            Lock
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
