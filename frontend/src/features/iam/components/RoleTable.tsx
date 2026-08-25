import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRoles, useCreateRole, useUpdateRole } from '../hooks/useRoles';
import { ErrorAlert, LoadingSpinner, EmptyState } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { IamRole } from '../domain/iam-models';

const roleSchema = z.object({
  code: z.string().min(1, 'Code is required').regex(/^[A-Z_]+$/, 'Code must be UPPERCASE_SNAKE_CASE'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormDialogProps {
  isOpen: boolean;
  role?: IamRole;
  onClose: () => void;
}

function RoleFormDialog({ isOpen, role, onClose }: RoleFormDialogProps) {
  const isEditMode = role !== undefined;
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole(role?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: role
      ? { code: role.code, name: role.name, description: role.description ?? '' }
      : { code: '', name: '', description: '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        role
          ? { code: role.code, name: role.name, description: role.description ?? '' }
          : { code: '', name: '', description: '' },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, role?.id]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    if (isEditMode) {
      await updateMutation.mutateAsync({ name: values.name, description: values.description });
    } else {
      await createMutation.mutateAsync(values);
    }
    onClose();
  });

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="role-form-dialog-title"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 420, width: '90%' }}>
        <h2 id="role-form-dialog-title" style={{ margin: '0 0 1rem' }}>
          {isEditMode ? 'Edit Role' : 'Create Role'}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label htmlFor="role-code">Code * (e.g. HR_ADMIN)</label>
            <input id="role-code" type="text" aria-required="true" disabled={isEditMode} {...register('code')} style={{ display: 'block', width: '100%' }} />
            {errors.code && <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.code.message}</span>}
          </div>
          <div>
            <label htmlFor="role-name">Name *</label>
            <input id="role-name" type="text" aria-required="true" {...register('name')} style={{ display: 'block', width: '100%' }} />
            {errors.name && <span role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.name.message}</span>}
          </div>
          <div>
            <label htmlFor="role-description">Description</label>
            <textarea id="role-description" {...register('description')} rows={3} style={{ display: 'block', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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

export function RoleTable() {
  const rolesQuery = useRoles();
  const [editingRole, setEditingRole] = useState<IamRole | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (rolesQuery.isPending) return <LoadingSpinner label="Loading roles…" />;
  if (rolesQuery.isError) return <ErrorAlert error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />;

  const roles = rolesQuery.data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button id="create-role-btn" onClick={() => setIsCreateOpen(true)} size="sm">
          + Create Role
        </Button>
      </div>

      {roles.length === 0 ? (
        <EmptyState message="No roles found." />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Code</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Permissions</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{role.code}</td>
                <td style={{ padding: '0.5rem' }}>{role.name}</td>
                <td style={{ padding: '0.5rem', color: '#6b7280' }}>{role.description ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{(role.permissionCodes || []).length} assigned</td>
                <td style={{ padding: '0.5rem' }}>
                  <Button variant="outlined" size="sm" aria-label={`Edit ${role.name}`} onClick={() => setEditingRole(role)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <RoleFormDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <RoleFormDialog isOpen={editingRole !== undefined} role={editingRole} onClose={() => setEditingRole(undefined)} />
    </div>
  );
}
