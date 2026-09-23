import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateJobRole, useUpdateJobRole } from '../hooks/useJobRoles';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgJobRole } from '../domain/organization-models';
import { AutoCodeButton } from '../../../shared/components/AutoCodeButton';
import { generateCode } from '../../../shared/utils/code-generator';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

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
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const createMutation = useCreateJobRole();
  const updateMutation = useUpdateJobRole();

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
        if (apiErr.code === 'ROLE_HAS_ACTIVE_EMPLOYEES') {
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
      aria-labelledby="role-form-dialog-title"
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
        <h2 id="role-form-dialog-title" style={{ margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 600, color: textColor }}>
          {isEditMode ? t('org.roles.modal.title_edit', 'Edit Role') : t('org.roles.modal.title_create', 'Create Role')}
        </h2>

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {!isEditMode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label htmlFor="role-code" style={{ fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
                  {t('org.roles.modal.code', 'Role Code')} *
                </label>
                <AutoCodeButton
                  onClick={() => {
                    const code = generateCode('ROLE', watch('name'));
                    setValue('code' as keyof CreateFormValues, code);
                  }}
                />
              </div>
              <input 
                id="role-code" 
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
            <label htmlFor="role-name" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
              {t('org.roles.modal.name', 'Role Name')} *
            </label>
            <input 
              id="role-name" 
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
            <label htmlFor="role-description" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
              {t('org.roles.modal.desc', 'Description')}
            </label>
            <textarea 
              id="role-description" 
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

          {isEditMode && (
             <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <input
                   id="role-active"
                   type="checkbox"
                   {...register('active' as keyof UpdateFormValues)}
                 />
                 <label htmlFor="role-active" style={{ fontWeight: 500, fontSize: '0.875rem', color: labelColor }}>
                   {t('org.status.active', 'Active')}
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
              {t('org.common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('org.common.saving', 'Saving…') : isEditMode ? t('org.common.save_changes', 'Save Changes') : t('org.roles.create', 'Create Role')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
