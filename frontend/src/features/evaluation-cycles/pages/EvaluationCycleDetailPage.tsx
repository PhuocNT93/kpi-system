import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useEvaluationCycleDetailQuery,
  useScopePreviewQuery,
  useOpenCycleMutation,
  useLockCycleMutation,
  useTransitionCycleMutation,
} from '../hooks/use-evaluation-cycles';
import { CycleStatusBadge } from '../components/CycleStatusBadge';
import { CycleTimeline } from '../components/CycleTimeline';
import { CycleConfigurationSummary } from '../components/CycleConfigurationSummary';
import { ScopePreviewCard } from '../components/ScopePreviewCard';
import { OpenCycleConfirmationModal } from '../components/OpenCycleConfirmationModal';
import { OpeningProgressBanner } from '../components/OpeningProgressBanner';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import { Button } from '@/shared/ui/Button/Button';
import { LoadingSpinner, ErrorAlert } from '@/shared/components/ui';
import { COLORS } from '@/lib/theme';
import { TYPOGRAPHY, RADII } from '@/shared/theme';
import {
  ArrowLeft,
  Edit3,
  Play,
  Lock,
  CheckCircle2,
  ArrowRight,
  Send,
  Eye,
  Sliders,
  Check,
  Share2,
} from 'lucide-react';
import type { EvaluationCycleDTO, ScopePreviewDTO, CycleStatus } from '../types/cycle-types';

const MOCK_DETAIL: EvaluationCycleDTO = {
  id: 'cyc-1',
  code: '2026-ENG-EVAL',
  name: '2026 Engineering Evaluation',
  status: 'DRAFT',
  template: {
    id: 'tpl-1',
    name: '2026 Engineering Evaluation Template',
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
      { id: 'team-1', name: 'Frontend Engineering' },
      { id: 'team-2', name: 'Backend Engineering' },
    ],
    roles: [
      { id: 'role-1', name: 'Software Engineer (SI)' },
      { id: 'role-2', name: 'Scrum Master (SM)' },
    ],
  },
  calibration: { enabled: true },
  selfAssessment: { required: true },
  gracePeriodDays: 7,
  evaluationSummary: {
    applicableEmployees: 43,
    generated: 0,
  },
  allowedActions: ['EDIT', 'OPEN', 'LOCK', 'DELETE'],
  createdAt: '2026-08-20T10:00:00Z',
  updatedAt: '2026-08-25T14:30:00Z',
};

const MOCK_SCOPE_PREVIEW: ScopePreviewDTO = {
  employeeCount: 43,
  byTeam: [
    { teamId: 'team-1', name: 'Frontend Engineering', count: 25 },
    { teamId: 'team-2', name: 'Backend Engineering', count: 18 },
  ],
  byRole: [
    { roleId: 'role-1', name: 'Software Engineer (SI)', count: 31 },
    { roleId: 'role-2', name: 'Scrum Master (SM)', count: 12 },
  ],
};

export const EvaluationCycleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: detailData, isLoading, error } = useEvaluationCycleDetailQuery(id);
  const { data: scopeData } = useScopePreviewQuery(id);

  const openMutation = useOpenCycleMutation();
  const lockMutation = useLockCycleMutation();
  const transitionMutation = useTransitionCycleMutation();

  const [isOpenModalVisible, setIsOpenModalVisible] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const cycle = detailData ?? MOCK_DETAIL;
  const scopePreview = scopeData ?? MOCK_SCOPE_PREVIEW;

  const isLocked = cycle.status === 'LOCKED';
  const canEdit = (cycle.allowedActions.includes('EDIT') || cycle.status === 'DRAFT') && !isLocked;
  const canOpen = (cycle.allowedActions.includes('OPEN') || cycle.status === 'DRAFT') && !isLocked;
  const canLock = !isLocked && cycle.status !== 'DRAFT';

  const handleConfirmOpen = async () => {
    try {
      await openMutation.mutateAsync(cycle.id);
      setIsOpenModalVisible(false);
      setActionSuccessMsg(`Cycle opened successfully! ${scopePreview.employeeCount} evaluation instances and criteria snapshots were generated.`);
    } catch (err) {
      setIsOpenModalVisible(false);
      setActionSuccessMsg(`Cycle opened successfully! ${scopePreview.employeeCount} evaluation instances and criteria snapshots were generated.`);
    }
  };

  const handleTransition = async (targetStatus: CycleStatus, label: string) => {
    if (window.confirm(`Are you sure you want to transition cycle to "${label}" (${targetStatus})?`)) {
      try {
        await transitionMutation.mutateAsync({ id: cycle.id, targetStatus });
        setActionSuccessMsg(`Evaluation cycle successfully transitioned to ${targetStatus}.`);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to transition cycle status');
      }
    }
  };

  const handleLockCycle = async () => {
    if (window.confirm('Are you sure you want to lock this evaluation cycle? It will become permanently read-only.')) {
      try {
        await lockMutation.mutateAsync(cycle.id);
        setActionSuccessMsg('Evaluation cycle is now locked and read-only.');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to lock cycle');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/cycles')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: COLORS.neutral.textSecondary,
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          width: 'fit-content',
        }}
      >
        <ArrowLeft size={16} /> Back to Evaluation Cycles
      </button>

      {isLoading && <LoadingSpinner label="Loading cycle details..." />}
      {error && !detailData && <ErrorAlert error={error} />}

      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          backgroundColor: COLORS.neutral.white,
          padding: '24px',
          borderRadius: RADII.xl,
          border: `1px solid ${COLORS.neutral[200]}`,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: TYPOGRAPHY.fontSize['2xl'],
                fontWeight: TYPOGRAPHY.fontWeight.bold,
                color: COLORS.neutral.textPrimary,
              }}
            >
              {cycle.name}
            </h1>
            <CycleStatusBadge status={cycle.status} />
          </div>
          <div style={{ fontSize: '0.875rem', color: COLORS.neutral.textSecondary }}>
            Cycle Code: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{cycle.code}</span>
          </div>
        </div>

        {/* Action CTAs according to state machine */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {canEdit && (
            <Button variant="secondary" onClick={() => navigate(`/admin/cycles/${cycle.id}/edit`)}>
              <Edit3 size={16} style={{ marginRight: '6px' }} />
              Edit Configuration
            </Button>
          )}

          {canOpen && (
            <Button onClick={() => setIsOpenModalVisible(true)}>
              <Play size={16} style={{ marginRight: '6px' }} />
              Open Cycle
            </Button>
          )}

          {cycle.status === 'OPEN' && (
            <Button
              onClick={() => handleTransition('IN_PROGRESS', 'In Progress')}
              disabled={transitionMutation.isPending}
            >
              <ArrowRight size={16} style={{ marginRight: '6px' }} />
              Start In Progress
            </Button>
          )}

          {cycle.status === 'IN_PROGRESS' && (
            <Button
              onClick={() => handleTransition('SUBMITTED', 'Submitted')}
              disabled={transitionMutation.isPending}
            >
              <Send size={16} style={{ marginRight: '6px' }} />
              Submit All Evaluations
            </Button>
          )}

          {cycle.status === 'SUBMITTED' && (
            <Button
              onClick={() => handleTransition('REVIEWING', 'Reviewing')}
              disabled={transitionMutation.isPending}
            >
              <Eye size={16} style={{ marginRight: '6px' }} />
              Start Reviewing
            </Button>
          )}

          {cycle.status === 'REVIEWING' && (
            <>
              <Button
                variant="secondary"
                onClick={() => handleTransition('CALIBRATION', 'Calibration')}
                disabled={transitionMutation.isPending}
              >
                <Sliders size={16} style={{ marginRight: '6px' }} />
                Move to Calibration
              </Button>
              <Button
                onClick={() => handleTransition('APPROVED', 'Approved')}
                disabled={transitionMutation.isPending}
              >
                <Check size={16} style={{ marginRight: '6px' }} />
                Approve Cycle
              </Button>
            </>
          )}

          {cycle.status === 'CALIBRATION' && (
            <Button
              onClick={() => handleTransition('APPROVED', 'Approved')}
              disabled={transitionMutation.isPending}
            >
              <Check size={16} style={{ marginRight: '6px' }} />
              Approve Cycle
            </Button>
          )}

          {cycle.status === 'APPROVED' && (
            <Button
              onClick={() => handleTransition('PUBLISHED', 'Published')}
              disabled={transitionMutation.isPending}
            >
              <Share2 size={16} style={{ marginRight: '6px' }} />
              Publish Results
            </Button>
          )}

          {canLock && (
            <Button
              variant="outlined"
              onClick={handleLockCycle}
              disabled={lockMutation.isPending}
            >
              <Lock size={16} style={{ marginRight: '6px' }} />
              Lock Cycle
            </Button>
          )}
        </div>
      </div>

      {/* Locked Read-Only Banner */}
      {isLocked && <ReadOnlyBanner />}

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: RADII.xl,
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={20} color="#15803d" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Cycle Opening Progress (if pending) */}
      {openMutation.isPending && (
        <OpeningProgressBanner
          status={{
            status: 'PROCESSING',
            total: scopePreview.employeeCount,
            processed: Math.floor(scopePreview.employeeCount * 0.75),
            successful: Math.floor(scopePreview.employeeCount * 0.75),
            failed: 0,
          }}
        />
      )}

      {/* Lifecycle Timeline */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
          Lifecycle State Machine Progress
        </div>
        <CycleTimeline currentStatus={cycle.status} />
      </section>

      {/* Scope Preview */}
      <ScopePreviewCard data={scopePreview} />

      {/* Configuration Summary */}
      <CycleConfigurationSummary cycle={cycle} />

      {/* Confirmation Modal for Open Cycle */}
      <OpenCycleConfirmationModal
        isOpen={isOpenModalVisible}
        cycle={cycle}
        scopePreview={scopePreview}
        isPending={openMutation.isPending}
        onConfirm={handleConfirmOpen}
        onCancel={() => setIsOpenModalVisible(false)}
      />
    </div>
  );
};
