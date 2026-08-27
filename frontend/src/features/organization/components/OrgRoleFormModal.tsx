import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateJobRole, useUpdateJobRole } from '../hooks/useJobRoles';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgJobRole } from '../domain/organization-models';

const createSchema = z.object({
  code: z.string().min(1, 'Role code is required').max(50, 'Code must be 50 characters or less'),
  name: z.string().min(1, 'Role name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface OrgRoleFormModalProps {
  isOpen: boolean;
  role?: OrgJobRole;
  onClose: () => void;
}

export function OrgRoleFormModal({ isOpen, role, onClose }: OrgRoleFormModalProps) {
  const isEditMode = role !== undefined;
  const createMutation = useCreateJobRole();
  const updateMutation = useUpdateJobRole();

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
    defaultValues: role
      ? { name: role.name, description: role.description || '', active: role.isActive }
      : { code: '', name: '', description: '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        role
          ? { name: role.name, description: role.description || '', active: role.isActive }
          : { code: '', name: '', description: '' },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, role?.id]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({ id: role.id, data: values as UpdateFormValues });
      } else {
        await createMutation.mutateAsync(values as CreateFormValues);
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const apiErr = err as { code: string; message: string };
        if (apiErr.code === 'DUPLICATE_ROLE_CODE') {
          setError('code' as keyof CreateFormValues, {
            message: 'This role code is already in use.',
          });
        }
      }
    }
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-form-dialog-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 500, width: '90%' }}>
        <h2 id="role-form-dialog-title" style={{ margin: '0 0 1rem' }}>
          {isEditMode ? 'Edit Role' : 'Create Role'}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {!isEditMode && (
            <div>
              <label htmlFor="role-code" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Role Code *
              </label>
              <input 
                id="role-code" 
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
            <label htmlFor="role-name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Role Name *
            </label>
            <input 
              id="role-name" 
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
            <label htmlFor="role-description" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Description
            </label>
            <textarea 
              id="role-description" 
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

          {isEditMode && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="role-active"
                  type="checkbox"
                  {...register('active' as keyof UpdateFormValues)}
                />
                <label htmlFor="role-active" style={{ fontWeight: 500 }}>
                  Active
                </label>
             </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Role'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
