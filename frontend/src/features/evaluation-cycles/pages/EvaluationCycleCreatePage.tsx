import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EvaluationCycleForm } from '../components/EvaluationCycleForm';
import { useCreateEvaluationCycleMutation } from '../hooks/use-evaluation-cycles';
import type { CreateEvaluationCyclePayload, TemplateReferenceDTO } from '../types/cycle-types';
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

export const EvaluationCycleCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateEvaluationCycleMutation();

  const handleSubmit = async (payload: CreateEvaluationCyclePayload) => {
    try {
      const created = await createMutation.mutateAsync(payload);
      navigate(`/admin/cycles/${created.id ?? 'cyc-1'}`);
    } catch {
      // Mock navigation if API is unmounted in local dev
      navigate('/admin/cycles');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

      <div>
        <h1
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.fontSize['2xl'],
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: COLORS.neutral.textPrimary,
          }}
        >
          Create Evaluation Cycle
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.neutral.textSecondary,
          }}
        >
          Configure cycle parameters, target scope, timeline dates, and published evaluation templates.
        </p>
      </div>

      <EvaluationCycleForm
        templatesOptions={MOCK_TEMPLATES}
        teamsOptions={MOCK_TEAMS}
        rolesOptions={MOCK_ROLES}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/cycles')}
        isPending={createMutation.isPending}
      />
    </div>
  );
};
