import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EvaluationCycleForm } from '../components/EvaluationCycleForm';
import {
  useEvaluationCycleDetailQuery,
  useUpdateEvaluationCycleMutation,
} from '../hooks/use-evaluation-cycles';
import type { CreateEvaluationCyclePayload, TemplateReferenceDTO } from '../types/cycle-types';
import { LoadingSpinner, ErrorAlert } from '@/shared/components/ui';
import { COLORS } from '@/lib/theme';
import { TYPOGRAPHY } from '@/shared/theme';
import { ArrowLeft } from 'lucide-react';

const MOCK_TEMPLATES: TemplateReferenceDTO[] = [
  {
    id: 'tpl-1',
    name: '2026 Engineering Evaluation',
    version: 'v3',
    status: 'PUBLISHED',
    criteriaCount: 18,
  },
  {
    id: 'tpl-2',
    name: 'Management & Leadership Evaluation',
    version: 'v1',
    status: 'PUBLISHED',
    criteriaCount: 12,
  },
];

const MOCK_TEAMS = [
  { id: 'team-1', name: 'Frontend Engineering' },
  { id: 'team-2', name: 'Backend Engineering' },
  { id: 'team-3', name: 'Mobile App Team' },
  { id: 'team-4', name: 'DevOps & Cloud' },
];

const MOCK_ROLES = [
  { id: 'role-1', name: 'Software Engineer (SI)' },
  { id: 'role-2', name: 'Scrum Master (SM)' },
  { id: 'role-3', name: 'Business Analyst (BA)' },
  { id: 'role-4', name: 'Engineering Manager (EM)' },
];

export const EvaluationCycleEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: detailData, isLoading, error } = useEvaluationCycleDetailQuery(id);
  const updateMutation = useUpdateEvaluationCycleMutation(id ?? '');

  const handleSubmit = async (payload: CreateEvaluationCyclePayload) => {
    try {
      if (id) {
        await updateMutation.mutateAsync(payload);
        navigate(`/admin/cycles/${id}`);
      }
    } catch {
      navigate(`/admin/cycles/${id}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <button
        onClick={() => navigate(`/admin/cycles/${id}`)}
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
        <ArrowLeft size={16} /> Back to Cycle Detail
      </button>

      <div>
        <h1
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.fontSize['2xl'],
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: COLORS.neutral.textPrimary,
          }}
        >
          Edit Evaluation Cycle
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.neutral.textSecondary,
          }}
        >
          Modify draft cycle settings before opening.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading cycle settings..." />}
      {error && !detailData && <ErrorAlert error={error} />}

      <EvaluationCycleForm
        initialValues={detailData}
        templatesOptions={MOCK_TEMPLATES}
        teamsOptions={MOCK_TEAMS}
        rolesOptions={MOCK_ROLES}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/admin/cycles/${id}`)}
        isPending={updateMutation.isPending}
      />
    </div>
  );
};
