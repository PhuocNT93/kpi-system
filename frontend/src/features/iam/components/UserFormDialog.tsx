import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateUser, useUpdateUser } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { IamUser } from '../domain/iam-models';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role_code: z.string().min(1, 'Role is required'),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role_code: z.string().min(1, 'Role is required'),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface UserFormDialogProps {
  isOpen: boolean;
  /** Pass an existing user to edit; undefined = create mode */
  user?: IamUser;
  onClose: () => void;
}

export function UserFormDialog({ isOpen, user, onClose }: UserFormDialogProps) {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const isEditMode = user !== undefined;
  const rolesQuery = useRoles();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(user?.id ?? '');

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
    defaultValues: user
      ? { name: user.name, role_code: user.roleCode }
      : { name: '', email: '', password: '', role_code: '' },
  });

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      reset(
        user
          ? { name: user.name, role_code: user.roleCode }
          : { name: '', email: '', password: '', role_code: '' },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id]);

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
      // Per FE Rule §5: map meta.error.details to field errors
      if (err && typeof err === 'object' && 'code' in err) {
        const apiErr = err as { code: string; message: string };
        if (apiErr.code === 'DUPLICATE_EMAIL') {
          setError('email' as keyof CreateFormValues, {
            message: t('iam.users.duplicate_email', 'This email is already registered.'),
          });
        }
      }
      // Error is also displayed via ErrorAlert below
    }
  });

  const inputStyle = {
    display: 'block',
    width: '100%',
    padding: '0.45rem 0.75rem',
    borderRadius: 6,
    border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
    background: isDark ? '#1f2937' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: '0.875rem',
    boxSizing: 'border-box' as const,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-dialog-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: isDark ? '#111827' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`, borderRadius: 8, padding: '1.5rem', maxWidth: 480, width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
        <h2 id="user-form-dialog-title" style={{ margin: '0 0 1rem', color: isDark ? '#f8fafc' : '#0f172a' }}>
          {isEditMode ? t('iam.users.edit_user', 'Edit User') : t('iam.users.create_user', 'Create User')}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label htmlFor="user-name" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#cbd5e1' : '#374151' }}>
              {t('iam.users.fullname', 'Full Name')} *
            </label>
            <input id="user-name" type="text" aria-required="true" {...register('name')} style={inputStyle} />
            {errors.name && <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.name.message}</span>}
          </div>

          {!isEditMode && (
            <>
              <div>
                <label htmlFor="user-email" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#cbd5e1' : '#374151' }}>
                  {t('iam.users.email', 'Email')} *
                </label>
                <input id="user-email" type="email" aria-required="true" {...register('email' as keyof CreateFormValues)} style={inputStyle} />
                {(errors as Record<string, { message?: string }>).email && (
                  <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                    {(errors as Record<string, { message?: string }>).email?.message}
                  </span>
                )}
              </div>
              <div>
                <label htmlFor="user-password" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#cbd5e1' : '#374151' }}>
                  {t('iam.users.password', 'Password')} *
                </label>
                <input id="user-password" type="password" aria-required="true" {...register('password' as keyof CreateFormValues)} style={inputStyle} />
                {(errors as Record<string, { message?: string }>).password && (
                  <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                    {(errors as Record<string, { message?: string }>).password?.message}
                  </span>
                )}
              </div>
            </>
          )}

          <div>
            <label htmlFor="user-role" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#cbd5e1' : '#374151' }}>
              {t('iam.users.role', 'Role')} *
            </label>
            <select id="user-role" aria-required="true" {...register('role_code')} style={inputStyle}>
              <option value="">{t('iam.users.select_role', 'Select a role…')}</option>
              {rolesQuery.data?.map((role) => (
                <option key={role.id} value={role.code}>{role.name}</option>
              ))}
            </select>
            {errors.role_code && <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.role_code.message}</span>}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>{t('common.cancel', 'Cancel')}</Button>
            {/* Per FE Rule §5: disable repeated submits while pending */}
            <Button type="submit" disabled={isPending}>
              {isPending ? t('common.saving', 'Saving…') : isEditMode ? t('common.save_changes', 'Save Changes') : t('iam.users.create_user', 'Create User')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
