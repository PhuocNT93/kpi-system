import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EvaluationCycleTable } from '../components/EvaluationCycleTable';
import {
  useEvaluationCyclesQuery,
  useLockCycleMutation,
} from '../hooks/use-evaluation-cycles';
import type { EvaluationCycleDTO } from '../types/cycle-types';
import { LoadingSpinner, ErrorAlert } from '@/shared/components/ui';
import { COLORS } from '@/lib/theme';
import { TYPOGRAPHY } from '@/shared/theme';

const MOCK_CYCLES: EvaluationCycleDTO[] = [
  {
    id: 'cyc-1',
    code: '2026-ENG-EVAL',
    name: '2026 Engineering Evaluation',
    status: 'DRAFT',
    template: {
      id: 'tpl-1',
      name: 'Engineering Evaluation Template',
      version: 'v3',
      status: 'PUBLISHED',
      criteriaCount: 18,
    },
    period: {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    },
    scope: {
      teams: [
        { id: 'team-1', name: 'Frontend Team' },
        { id: 'team-2', name: 'Backend Team' },
      ],
      roles: [
        { id: 'role-1', name: 'Software Engineer' },
        { id: 'role-2', name: 'Senior Engineer' },
      ],
    },
    calibration: { enabled: true },
    selfAssessment: { required: true },
    gracePeriodDays: 7,
    evaluationSummary: {
      applicableEmployees: 43,
      generated: 0,
    },
    allowedActions: ['EDIT', 'OPEN', 'DELETE'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-25T14:30:00Z',
  },
  {
    id: 'cyc-2',
    code: '2026-MGMT-EVAL',
    name: '2026 Management & Leadership Cycle',
    status: 'OPEN',
    template: {
      id: 'tpl-2',
      name: 'Management Evaluation Template',
      version: 'v1',
      status: 'PUBLISHED',
      criteriaCount: 12,
    },
    period: {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    },
    scope: {
      teams: [],
      roles: [{ id: 'role-3', name: 'Engineering Manager' }],
    },
    calibration: { enabled: true },
    selfAssessment: { required: true },
    gracePeriodDays: 5,
    evaluationSummary: {
      applicableEmployees: 14,
      generated: 14,
      inProgress: 10,
    },
    allowedActions: ['VIEW', 'MANAGE', 'LOCK'],
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-08-10T11:20:00Z',
    openedAt: '2026-08-10T11:20:00Z',
  },
  {
    id: 'cyc-3',
    code: '2025-ANNUAL-EVAL',
    name: '2025 Annual Performance Evaluation',
    status: 'LOCKED',
    template: {
      id: 'tpl-1',
      name: 'Engineering Evaluation Template',
      version: 'v2',
      status: 'PUBLISHED',
      criteriaCount: 15,
    },
    period: {
      startDate: '2025-12-01',
      endDate: '2025-12-31',
    },
    scope: {
      teams: [],
      roles: [],
    },
    calibration: { enabled: false },
    selfAssessment: { required: true },
    gracePeriodDays: 7,
    evaluationSummary: {
      applicableEmployees: 120,
      generated: 120,
      completed: 120,
    },
    allowedActions: ['VIEW'],
    createdAt: '2025-11-15T08:00:00Z',
    updatedAt: '2026-01-10T16:00:00Z',
    openedAt: '2025-12-01T00:00:00Z',
    lockedAt: '2026-01-10T16:00:00Z',
  },
];

export const EvaluationCycleListPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useEvaluationCyclesQuery();

  const lockMutation = useLockCycleMutation();

  const cycles = data ?? MOCK_CYCLES;

  const handleOpen = (id: string) => {
    navigate(`/admin/cycles/${id}`);
  };

  const handleLock = async (id: string) => {
    if (window.confirm('Are you sure you want to lock this cycle? All evaluations will become permanently read-only.')) {
      try {
        await lockMutation.mutateAsync(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to lock cycle');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.fontSize['2xl'],
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: COLORS.neutral.textPrimary,
          }}
        >
          Evaluation Cycles
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.neutral.textSecondary,
          }}
        >
          Configure, manage, open, and review company performance evaluation cycles.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading evaluation cycles..." />}
      {error && !data && <ErrorAlert error={error} onRetry={refetch} />}

      <EvaluationCycleTable
        cycles={cycles}
        onView={(id) => navigate(`/admin/cycles/${id}`)}
        onEdit={(id) => navigate(`/admin/cycles/${id}/edit`)}
        onOpen={handleOpen}
        onLock={handleLock}
        onCreateNew={() => navigate('/admin/cycles/new')}
        templatesOptions={[
          { id: 'tpl-1', name: 'Engineering Evaluation Template' },
          { id: 'tpl-2', name: 'Management Evaluation Template' },
        ]}
        teamsOptions={[
          { id: 'team-1', name: 'Frontend Team' },
          { id: 'team-2', name: 'Backend Team' },
        ]}
      />
    </div>
  );
};
