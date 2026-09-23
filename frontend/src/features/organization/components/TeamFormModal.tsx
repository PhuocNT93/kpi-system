import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateTeam, useUpdateTeam } from '../hooks/useTeams';
import { useDepartments } from '../hooks/useDepartments';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgTeam } from '../domain/organization-models';
import { AutoCodeButton } from '../../../shared/components/AutoCodeButton';
import { generateCode } from '../../../shared/utils/code-generator';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

const createSchema = z.object({
  code: z.string().min(1, 'Team code is required').max(20, 'Code must be 20 characters or less'),
  name: z.string().min(1, 'Team name is required').max(100, 'Name must be 100 characters or less'),
  department_id: z.string().min(1, 'Department is required'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Name must be 100 characters or less'),
  department_id: z.string().min(1, 'Department is required'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface TeamFormModalProps {
  isOpen: boolean;
  team?: OrgTeam;
  onClose: () => void;
}

export function TeamFormModal({ isOpen, team, onClose }: TeamFormModalProps) {
  const isEditMode = team !== undefined;
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const departmentsQuery = useDepartments();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam(team?.id ?? '');

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateFormValues | UpdateFormValues>({
    resolver: zodResolver(isEditMode ? updateSchema : createSchema),
    defaultValues: team
      ? { name: team.name, department_id: team.departmentId, description: team.description ?? '' }
      : { code: '', name: '', department_id: '', description: '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        team
          ? { name: team.name, department_id: team.departmentId, description: team.description ?? '' }
          : { code: '', name: '', department_id: '', description: '' },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, team?.id]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync(values as UpdateFormValues);
      } else {
        await createMutation.mutateAsync(values as CreateFormValues);
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const apiErr = err as { code: string; message: string };
        if (apiErr.code === 'DUPLICATE_TEAM_CODE') {
          setError('code' as keyof CreateFormValues, {
            message: 'This team code is already in use.',
          });
        }
        if (apiErr.code === 'DEPARTMENT_INACTIVE') {
          setError('department_id', {
            message: apiErr.message,
          });
        }
      }
    }
  });

  const modalBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#111827';
  const labelColor = isDark ? '#e2e8f0' : '#374151';
  const inputBg = isDark ? '#0f172a' : '#ffffff';
  const inputBorder = isDark ? '#334155' : '#d1d5db';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-form-dialog-title"
      className="org-modal-overlay"
    >
      <div
        className="org-modal-card"
        style={{
          background: modalBg,
          color: textColor,
          border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        }}
      >
        <h2 id="team-form-dialog-title" style={{ margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 600, color: textColor }}>
          {isEditMode ? 'Edit Team' : 'Create Team'}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {!isEditMode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label htmlFor="team-code" style={{ fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
                  {t('col_code', 'Team Code')} *
                </label>
                <AutoCodeButton
                  onClick={() => {
                    const code = generateCode('TEAM', watch('name'));
                    setValue('code' as keyof CreateFormValues, code);
                  }}
                />
              </div>
              <input 
                id="team-code" 
                type="text" 
                aria-required="true" 
                {...register('code' as keyof CreateFormValues)} 
                style={{
                  display: 'block', width: '100%', padding: '0.625rem 0.75rem',
                  background: inputBg, color: textColor,
                  border: `1px solid ${inputBorder}`, borderRadius: '6px', fontSize: '0.875rem',
                }} 
              />
              {(errors as Record<string, { message?: string }>).code && (
                <span role="alert" style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                  {(errors as Record<string, { message?: string }>).code?.message}
                </span>
              )}
            </div>
          )}

          <div>
            <label htmlFor="team-name" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
              {t('col_name', 'Team Name')} *
            </label>
            <input 
              id="team-name" 
              type="text" 
              aria-required="true" 
              {...register('name')} 
              style={{
                display: 'block', width: '100%', padding: '0.625rem 0.75rem',
                background: inputBg, color: textColor,
                border: `1px solid ${inputBorder}`, borderRadius: '6px', fontSize: '0.875rem',
              }} 
            />
            {errors.name && (
              <span role="alert" style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.name.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="team-department" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
              Department *
            </label>
            <select 
              id="team-department" 
              aria-required="true" 
              {...register('department_id')} 
              style={{
                display: 'block', width: '100%', padding: '0.625rem 0.75rem',
                background: inputBg, color: textColor,
                border: `1px solid ${inputBorder}`, borderRadius: '6px', fontSize: '0.875rem',
              }}
            >
              <option value="">Select a department…</option>
              {departmentsQuery.data
                ?.filter(d => d.isActive || (!team?.isActive && d.id === team?.departmentId))
                .map((dept) => (
                  <option key={dept.id} value={dept.id} style={{ background: inputBg, color: textColor }}>
                    {!dept.isActive ? `[Inactive] ${dept.name} (${dept.code})` : `${dept.name} (${dept.code})`}
                  </option>
              ))}
            </select>
            {errors.department_id && (
              <span role="alert" style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.department_id.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="team-description" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
              {t('col_desc', 'Description')}
            </label>
            <textarea 
              id="team-description" 
              rows={3}
              {...register('description')} 
              style={{
                display: 'block', width: '100%', padding: '0.625rem 0.75rem',
                background: inputBg, color: textColor,
                border: `1px solid ${inputBorder}`, borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical',
              }} 
            />
            {errors.description && (
              <span role="alert" style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.description.message}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              {t('btn_cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('btn_saving', 'Saving…') : isEditMode ? t('btn_save', 'Save Changes') : 'Create Team'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
