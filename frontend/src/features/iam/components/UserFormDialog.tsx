import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateUser, useUpdateUser } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { IamUser } from '../domain/iam-models';

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
            message: 'This email is already registered.',
          });
        }
      }
      // Error is also displayed via ErrorAlert below
    }
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-dialog-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 480, width: '90%' }}>
        <h2 id="user-form-dialog-title" style={{ margin: '0 0 1rem' }}>
          {isEditMode ? 'Edit User' : 'Create User'}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label htmlFor="user-name">Full Name *</label>
            <input id="user-name" type="text" aria-required="true" {...register('name')} style={{ display: 'block', width: '100%' }} />
            {errors.name && <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.name.message}</span>}
          </div>

          {!isEditMode && (
            <>
              <div>
                <label htmlFor="user-email">Email *</label>
                <input id="user-email" type="email" aria-required="true" {...register('email' as keyof CreateFormValues)} style={{ display: 'block', width: '100%' }} />
                {(errors as Record<string, { message?: string }>).email && (
                  <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                    {(errors as Record<string, { message?: string }>).email?.message}
                  </span>
                )}
              </div>
              <div>
                <label htmlFor="user-password">Password *</label>
                <input id="user-password" type="password" aria-required="true" {...register('password' as keyof CreateFormValues)} style={{ display: 'block', width: '100%' }} />
                {(errors as Record<string, { message?: string }>).password && (
                  <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                    {(errors as Record<string, { message?: string }>).password?.message}
                  </span>
                )}
              </div>
            </>
          )}

          <div>
            <label htmlFor="user-role">Role *</label>
            <select id="user-role" aria-required="true" {...register('role_code')} style={{ display: 'block', width: '100%' }}>
              <option value="">Select a role…</option>
              {rolesQuery.data?.map((role) => (
                <option key={role.id} value={role.code}>{role.name}</option>
              ))}
            </select>
            {errors.role_code && <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.role_code.message}</span>}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
            {/* Per FE Rule §5: disable repeated submits while pending */}
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
