import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateDepartment, useUpdateDepartment } from '../hooks/useDepartments';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgDepartment } from '../domain/organization-models';

const createSchema = z.object({
  code: z.string().min(1, 'Department code is required').max(20, 'Code must be 20 characters or less'),
  name: z.string().min(1, 'Department name is required').max(100, 'Name must be 100 characters or less'),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100, 'Name must be 100 characters or less'),
  active: z.boolean().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface DepartmentFormModalProps {
  isOpen: boolean;
  department?: OrgDepartment;
  onClose: () => void;
}

export function DepartmentFormModal({ isOpen, department, onClose }: DepartmentFormModalProps) {
  const isEditMode = department !== undefined;
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();

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
    defaultValues: department
      ? { name: department.name, active: department.isActive }
      : { code: '', name: '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        department
          ? { name: department.name, active: department.isActive }
          : { code: '', name: '' },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, department?.id]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({ id: department.id, data: values as UpdateFormValues });
      } else {
        await createMutation.mutateAsync(values as CreateFormValues);
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const apiErr = err as { code: string; message: string };
        if (apiErr.code === 'DUPLICATE_DEPARTMENT_CODE') {
          setError('code' as keyof CreateFormValues, {
            message: 'This department code is already in use.',
          });
        }
      }
    }
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="department-form-dialog-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 500, width: '90%' }}>
        <h2 id="department-form-dialog-title" style={{ margin: '0 0 1rem' }}>
          {isEditMode ? 'Edit Department' : 'Create Department'}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {!isEditMode && (
            <div>
              <label htmlFor="dept-code" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Department Code *
              </label>
              <input 
                id="dept-code" 
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
            <label htmlFor="dept-name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Department Name *
            </label>
            <input 
              id="dept-name" 
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

          {isEditMode && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="dept-active"
                  type="checkbox"
                  {...register('active' as keyof UpdateFormValues)}
                />
                <label htmlFor="dept-active" style={{ fontWeight: 500 }}>
                  Active
                </label>
             </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Department'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
