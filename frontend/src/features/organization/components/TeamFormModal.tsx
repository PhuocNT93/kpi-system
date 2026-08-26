import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateTeam, useUpdateTeam } from '../hooks/useTeams';
import { useDepartments } from '../hooks/useDepartments';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgTeam } from '../domain/organization-models';

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
  const departmentsQuery = useDepartments();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam(team?.id ?? '');

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const {
    register,
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
      }
    }
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-form-dialog-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 500, width: '90%' }}>
        <h2 id="team-form-dialog-title" style={{ margin: '0 0 1rem' }}>
          {isEditMode ? 'Edit Team' : 'Create Team'}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {!isEditMode && (
            <div>
              <label htmlFor="team-code" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Team Code *
              </label>
              <input 
                id="team-code" 
                type="text" 
                aria-required="true" 
                {...register('code' as keyof CreateFormValues)} 
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} 
              />
              {(errors as Record<string, { message?: string }>).code && (
                <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  {(errors as Record<string, { message?: string }>).code?.message}
                </span>
              )}
            </div>
          )}

          <div>
            <label htmlFor="team-name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Team Name *
            </label>
            <input 
              id="team-name" 
              type="text" 
              aria-required="true" 
              {...register('name')} 
              style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} 
            />
            {errors.name && (
              <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.name.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="team-department" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Department *
            </label>
            <select 
              id="team-department" 
              aria-required="true" 
              {...register('department_id')} 
              style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="">Select a department…</option>
              {departmentsQuery.data?.filter(d => d.isActive || d.id === team?.departmentId).map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
              ))}
            </select>
            {errors.department_id && (
              <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.department_id.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="team-description" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Description
            </label>
            <textarea 
              id="team-description" 
              rows={3}
              {...register('description')} 
              style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', resize: 'vertical' }} 
            />
            {errors.description && (
              <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.description.message}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Team'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
