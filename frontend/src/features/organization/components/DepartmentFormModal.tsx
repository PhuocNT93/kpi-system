import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateDepartment, useUpdateDepartment } from '../hooks/useDepartments';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgDepartment } from '../domain/organization-models';
import { AutoCodeButton } from '../../../shared/components/AutoCodeButton';
import { generateCode } from '../../../shared/utils/code-generator';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

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
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();

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
        if (apiErr.code === 'DEPARTMENT_HAS_ACTIVE_MEMBERS') {
          setError('active' as keyof UpdateFormValues, {
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
      aria-labelledby="department-form-dialog-title"
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
        <h2 id="department-form-dialog-title" style={{ margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 600, color: textColor }}>
          {isEditMode ? 'Edit Department' : 'Create Department'}
        </h2>

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {!isEditMode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label htmlFor="dept-code" style={{ fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
                  {t('col_code', 'Department Code')} *
                </label>
                <AutoCodeButton
                  onClick={() => {
                    const code = generateCode('DEPT', watch('name'));
                    setValue('code' as keyof CreateFormValues, code);
                  }}
                />
              </div>
              <input 
                id="dept-code" 
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
            <label htmlFor="dept-name" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
              {t('col_name', 'Department Name')} *
            </label>
            <input 
              id="dept-name" 
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

          {isEditMode && (
             <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <input
                   id="dept-active"
                   type="checkbox"
                   {...register('active' as keyof UpdateFormValues)}
                 />
                 <label htmlFor="dept-active" style={{ fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
                   {t('col_status', 'Active')}
                 </label>
               </div>
               {(errors as Record<string, { message?: string }>).active && (
                 <span role="alert" style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                   {(errors as Record<string, { message?: string }>).active?.message}
                 </span>
               )}
             </div>
          )}

          {mutationError && Object.keys(errors).length === 0 && (
            <span role="alert" style={{ color: '#ef4444', fontSize: '0.8125rem', display: 'block' }}>
              {(mutationError as { message?: string })?.message || 'An error occurred'}
            </span>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              {t('btn_cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('btn_saving', 'Saving…') : isEditMode ? t('btn_save', 'Save Changes') : 'Create Department'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
