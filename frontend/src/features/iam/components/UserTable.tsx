import { useState } from 'react';
import { useUsers, useToggleUserStatus } from '../hooks/useUsers';
import { UserFormDialog } from './UserFormDialog';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { IamUser } from '../domain/iam-models';

export function UserTable() {
  const usersQuery = useUsers();
  const [editingUser, setEditingUser] = useState<IamUser | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<IamUser | null>(null);

  const toggleMutation = useToggleUserStatus(
    pendingToggle?.id ?? '',
    pendingToggle?.isActive ?? false,
  );

  if (usersQuery.isPending) return <LoadingSpinner label="Loading users…" />;
  if (usersQuery.isError) return <ErrorAlert error={usersQuery.error} onRetry={() => usersQuery.refetch()} />;

  const users = usersQuery.data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button id="create-user-btn" onClick={() => setIsCreateOpen(true)} size="sm">
          + Create User
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Role</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.5rem' }}>{user.name}</td>
                <td style={{ padding: '0.5rem' }}>{user.email}</td>
                <td style={{ padding: '0.5rem' }}>{user.roleCode}</td>
                <td style={{ padding: '0.5rem' }}>
                  <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                <td style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="outlined"
                    size="sm"
                    aria-label={`Edit ${user.name}`}
                    onClick={() => setEditingUser(user)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}`}
                    onClick={() => setPendingToggle(user)}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Create Dialog */}
      <UserFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit Dialog */}
      <UserFormDialog
        isOpen={editingUser !== undefined}
        user={editingUser}
        onClose={() => setEditingUser(undefined)}
      />

      {/* Confirm toggle active status */}
      <ConfirmDialog
        isOpen={pendingToggle !== null}
        title={pendingToggle?.isActive ? 'Deactivate User' : 'Activate User'}
        description={
          pendingToggle?.isActive
            ? `Deactivate ${pendingToggle?.name}? They will no longer be able to log in.`
            : `Activate ${pendingToggle?.name}? They will be able to log in again.`
        }
        confirmLabel={pendingToggle?.isActive ? 'Deactivate' : 'Activate'}
        isPending={toggleMutation.isPending}
        onConfirm={async () => {
          await toggleMutation.mutateAsync();
          setPendingToggle(null);
        }}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
}
