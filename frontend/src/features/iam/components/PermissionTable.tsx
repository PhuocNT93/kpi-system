import { usePermissions, useRoles, useAssignPermission, useRevokePermission } from '../hooks/useRoles';
import { ErrorAlert, LoadingSpinner, EmptyState } from '../../../shared/components/ui';

export function PermissionTable() {
  const permissionsQuery = usePermissions();
  const rolesQuery = useRoles();

  if (permissionsQuery.isPending || rolesQuery.isPending) return <LoadingSpinner label="Loading permissions…" />;
  if (permissionsQuery.isError) return <ErrorAlert error={permissionsQuery.error} onRetry={() => permissionsQuery.refetch()} />;
  if (rolesQuery.isError) return <ErrorAlert error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />;

  const permissions = permissionsQuery.data ?? [];
  const roles = rolesQuery.data ?? [];

  if (permissions.length === 0) return <EmptyState message="No permissions defined." />;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Permission Code</th>
          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
          {roles.map((role) => (
            <th key={role.id} style={{ textAlign: 'center', padding: '0.5rem' }}>{role.code}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {permissions.map((perm) => (
          <tr key={perm.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{perm.code}</td>
            <td style={{ padding: '0.5rem' }}>{perm.name}</td>
            <td style={{ padding: '0.5rem', color: '#6b7280' }}>{perm.description ?? '—'}</td>
            {roles.map((role) => (
              <PermissionCell
                key={role.id}
                roleId={role.id}
                permissionCode={perm.code}
                isAssigned={(role.permissionCodes || []).includes(perm.code)}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface PermissionCellProps {
  roleId: string;
  permissionCode: string;
  isAssigned: boolean;
}

function PermissionCell({ roleId, permissionCode, isAssigned }: PermissionCellProps) {
  const assignMutation = useAssignPermission(roleId);
  const revokeMutation = useRevokePermission(roleId);
  const isPending = assignMutation.isPending || revokeMutation.isPending;

  const handleToggle = async () => {
    if (isAssigned) {
      await revokeMutation.mutateAsync(permissionCode);
    } else {
      await assignMutation.mutateAsync({ permission_code: permissionCode });
    }
  };

  return (
    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
      <input
        type="checkbox"
        checked={isAssigned}
        disabled={isPending}
        onChange={handleToggle}
        aria-label={`${isAssigned ? 'Revoke' : 'Assign'} ${permissionCode}`}
      />
    </td>
  );
}
