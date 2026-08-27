import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateJobLevel, useUpdateJobLevel } from '../hooks/useJobLevels';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgJobLevel } from '../domain/organization-models';

const createSchema = z.object({
  code: z.string().min(1, 'Level code is required').max(50, 'Code must be 50 characters or less'),
  name: z.string().min(1, 'Level name is required').max(100, 'Name must be 100 characters or less'),
  rank: z.number().int().min(1, 'Rank must be at least 1').max(100, 'Rank is too high'),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Level name is required').max(100, 'Name must be 100 characters or less'),
  rank: z.number().int().min(1, 'Rank must be at least 1').max(100, 'Rank is too high'),
  active: z.boolean().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface JobLevelFormModalProps {
  isOpen: boolean;
  level?: OrgJobLevel;
  onClose: () => void;
}

export function JobLevelFormModal({ isOpen, level, onClose }: JobLevelFormModalProps) {
  const isEditMode = level !== undefined;
  const createMutation = useCreateJobLevel();
  const updateMutation = useUpdateJobLevel();

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
    defaultValues: level
      ? { name: level.name, rank: level.rank, active: level.isActive }
      : { code: '', name: '', rank: 1 },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        level
          ? { name: level.name, rank: level.rank, active: level.isActive }
          : { code: '', name: '', rank: 1 },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, level?.id]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({ id: level.id, data: values as UpdateFormValues });
      } else {
        await createMutation.mutateAsync(values as CreateFormValues);
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const apiErr = err as { code: string; message: string };
        if (apiErr.code === 'DUPLICATE_JOB_LEVEL_CODE') {
          setError('code' as keyof CreateFormValues, {
            message: 'This job level code is already in use.',
          });
        }
      }
    }
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-form-dialog-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 500, width: '90%' }}>
        <h2 id="level-form-dialog-title" style={{ margin: '0 0 1rem' }}>
          {isEditMode ? 'Edit Job Level' : 'Create Job Level'}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {!isEditMode && (
            <div>
              <label htmlFor="level-code" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Job Level Code *
              </label>
              <input 
                id="level-code" 
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
            <label htmlFor="level-name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Job Level Name *
            </label>
            <input 
              id="level-name" 
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
            <label htmlFor="level-rank" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Rank (lower is more senior) *
            </label>
            <input 
              id="level-rank" 
              type="number" 
              aria-required="true" 
              {...register('rank', { valueAsNumber: true })} 
              style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} 
            />
            {errors.rank && (
              <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.rank.message}
              </span>
            )}
          </div>

          {isEditMode && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="level-active"
                  type="checkbox"
                  {...register('active' as keyof UpdateFormValues)}
                />
                <label htmlFor="level-active" style={{ fontWeight: 500 }}>
                  Active
                </label>
             </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Job Level'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
