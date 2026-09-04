import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EvaluationCycleForm } from '../components/EvaluationCycleForm';
import {
  useEvaluationCycleDetailQuery,
  useUpdateEvaluationCycleMutation,
  useCreateEvaluationCycleMutation,
} from '../hooks/use-evaluation-cycles';
import type { CreateEvaluationCyclePayload, TemplateReferenceDTO } from '../types/cycle-types';
import { useTemplatesQuery } from '@/features/templates/api/use-templates';
import { useTeams } from '@/features/organization/hooks/useTeams';
import { useEmployees } from '@/features/organization/hooks/useEmployees';
import { useRoles } from '@/features/iam/hooks/useRoles';
import { LoadingSpinner, ErrorAlert } from '@/shared/components/ui';
import { COLORS } from '@/lib/theme';
import { TYPOGRAPHY } from '@/shared/theme';
import { ArrowLeft } from 'lucide-react';

export const EvaluationCycleUpsertPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const templatesQuery = useTemplatesQuery();
  const teamsQuery = useTeams();
  const rolesQuery = useRoles();
  const employeesQuery = useEmployees();

  const createMutation = useCreateEvaluationCycleMutation();
  const { data: detailData, isLoading: detailLoading, error } = useEvaluationCycleDetailQuery(id);
  const updateMutation = useUpdateEvaluationCycleMutation(id ?? '');

  const handleSubmit = async (payload: CreateEvaluationCyclePayload) => {
    try {
      if (isEdit) {
        if (!id) return;
        await updateMutation.mutateAsync(payload);
        navigate(`/admin/cycles/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        navigate(`/admin/cycles/${created.id ?? 'cyc-1'}`);
      }
    } catch (_err) {
      navigate(isEdit ? `/admin/cycles/${id}` : '/admin/cycles');
    }
  };

  const templatesOptions: TemplateReferenceDTO[] = (templatesQuery.data || []).map((t: { id: string; name: string; currentVersionId?: string; currentVersion?: { id?: string; versionNo?: number; criteria?: unknown[] }; version?: number; status?: string; criteriaCount?: number }) => ({
    id: t.currentVersionId ?? t.currentVersion?.id ?? t.id,
    name: t.name,
    version: t.currentVersion?.versionNo ? `v${t.currentVersion.versionNo}` : `v${t.version}`,
    status: (t.status || 'DRAFT') as TemplateReferenceDTO['status'],
    criteriaCount: t.criteriaCount ?? t.currentVersion?.criteria?.length,
  }));

  const teamsOptions = (teamsQuery.data || []).map((team: { id: string; name: string }) => ({ id: team.id, name: team.name }));
  const rolesOptions = (rolesQuery.data || []).map((role: { id: string; name: string }) => ({ id: role.id, name: role.name }));
  const isAnyFetching =
    templatesQuery.isFetching || teamsQuery.isFetching || rolesQuery.isFetching || employeesQuery.isFetching || createMutation.isPending || updateMutation.isPending;
    

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <button
        onClick={() => navigate(isEdit ? `/admin/cycles/${id}` : '/admin/cycles')}
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
        <ArrowLeft size={16} /> {isEdit ? 'Back to Cycle Detail' : 'Back to Evaluation Cycles'}
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
          {isEdit ? 'Edit Evaluation Cycle' : 'Create Evaluation Cycle'}
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: COLORS.neutral.textSecondary,
          }}
        >
          {isEdit
            ? 'Modify draft cycle settings before opening.'
            : 'Configure cycle parameters, target scope, timeline dates, and published evaluation templates.'}
        </p>
      </div>

      {detailLoading && isEdit && <LoadingSpinner label="Loading cycle settings..." />}
      {error && !detailData && <ErrorAlert error={error} />}

      <EvaluationCycleForm
        initialValues={isEdit ? detailData : undefined}
        templatesOptions={templatesOptions}
        teamsOptions={teamsOptions}
        rolesOptions={rolesOptions}
        employeesOptions={employeesQuery.data ?? []}
        onSubmit={handleSubmit}
        onCancel={() => navigate(isEdit ? `/admin/cycles/${id}` : '/admin/cycles')}
        isPending={isAnyFetching}
      />
    </div>
  );
};

export default EvaluationCycleUpsertPage;
