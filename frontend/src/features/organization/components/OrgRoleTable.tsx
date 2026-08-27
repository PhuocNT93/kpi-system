import { useState } from 'react';
import { useJobRoles } from '../hooks/useJobRoles';
import { useAuth } from '../../../shared/auth/AuthContext';
import { OrgRoleFormModal } from './OrgRoleFormModal';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgJobRole } from '../domain/organization-models';

export function OrgRoleTable() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const rolesQuery = useJobRoles();
  const [editingRole, setEditingRole] = useState<OrgJobRole | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (rolesQuery.isPending) return <LoadingSpinner label="Loading roles..." />;
  if (rolesQuery.isError) return <ErrorAlert error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />;

  const roles = rolesQuery.data ?? [];

  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button id="create-role-btn" onClick={() => setIsCreateOpen(true)} size="sm">
            + Create Role
          </Button>
        </div>
      )}

      {roles.length === 0 ? (
        <EmptyState message="No roles found." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{role.code}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{role.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StatusBadge status={role.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="outlined"
                        size="sm"
                        aria-label={`Edit role ${role.name}`}
                        onClick={() => setEditingRole(role)}
                      >
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      {isAdmin && (
        <OrgRoleFormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* Edit Dialog */}
      {isAdmin && (
        <OrgRoleFormModal
          isOpen={editingRole !== undefined}
          role={editingRole}
          onClose={() => setEditingRole(undefined)}
        />
      )}
    </div>
  );
}
