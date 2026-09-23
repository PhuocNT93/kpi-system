import { useState, useRef, useEffect } from 'react';
import { useJobRoles, useBulkUpdateJobRoles } from '../hooks/useJobRoles';
import { useAuth } from '../../../shared/auth/auth-context';
import { OrgRoleFormModal } from './OrgRoleFormModal';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgJobRole } from '../domain/organization-models';
import { BulkActionBar } from './BulkActionBar';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

export function OrgRoleTable() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const rolesQuery = useJobRoles();
  const [editingRole, setEditingRole] = useState<OrgJobRole | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ type: 'ACTIVE' | 'INACTIVE'; isOpen: boolean } | null>(null);
  const bulkUpdateMutation = useBulkUpdateJobRoles();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const roles = rolesQuery.data ?? [];

  const isAllSelected = roles.length > 0 && selectedIds.size === roles.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < roles.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(roles.map((r) => r.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkConfirm = async () => {
    if (!bulkAction) return;
    try {
      await bulkUpdateMutation.mutateAsync({
        roleIds: Array.from(selectedIds),
        active: bulkAction.type === 'ACTIVE',
      });
      setSelectedIds(new Set());
      setBulkAction(null);
    } catch {
      // Mutation error displayed in ConfirmDialog
    }
  };

  const handleBulkCancel = () => {
    bulkUpdateMutation.reset();
    setBulkAction(null);
  };

  if (rolesQuery.isPending) return <LoadingSpinner label="Loading roles..." />;
  if (rolesQuery.isError) return <ErrorAlert error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />;

  const thStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: isDark ? '#cbd5e1' : '#4b5563',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: isDark ? '#f8fafc' : '#111827',
  };

  return (
    <div style={{ paddingBottom: '6rem' }}>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button id="create-role-btn" onClick={() => setIsCreateOpen(true)} size="sm">
            {t('btn_create_role', '+ Create Role')}
          </Button>
        </div>
      )}

      {roles.length === 0 ? (
        <EmptyState message={t('empty_roles', 'No job roles found.')} />
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '540px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: `2px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                  backgroundColor: isDark ? '#0f172a' : '#f9fafb',
                }}
              >
                {isAdmin && (
                  <th style={{ padding: '0.75rem 1rem', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      ref={headerCheckboxRef}
                      checked={isAllSelected}
                      onChange={handleToggleAll}
                      aria-label="Select all roles"
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th style={thStyle}>{t('col_code', 'Code')}</th>
                <th style={thStyle}>{t('col_name', 'Name')}</th>
                <th style={thStyle}>{t('col_status', 'Status')}</th>
                {isAdmin && <th style={{ ...thStyle, width: '150px' }}>{t('col_actions', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const isSelected = selectedIds.has(role.id);
                return (
                  <tr
                    key={role.id}
                    style={{
                      borderBottom: `1px solid ${isDark ? '#334155' : '#f3f4f6'}`,
                      backgroundColor: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') : undefined,
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {isAdmin && (
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(role.id)}
                          aria-label={`Select role ${role.name}`}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                    )}
                    <td style={{ ...tdStyle, fontWeight: 600, color: isDark ? '#93c5fd' : '#1d4ed8' }}>{role.code}</td>
                    <td style={tdStyle}>{role.name}</td>
                    <td style={tdStyle}>
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
                          {t('btn_edit', 'Edit')}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Action Bar */}
      {isAdmin && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          entityName={selectedIds.size === 1 ? 'role' : 'roles'}
          onActivate={() => {
            bulkUpdateMutation.reset();
            setBulkAction({ type: 'ACTIVE', isOpen: true });
          }}
          onDeactivate={() => {
            bulkUpdateMutation.reset();
            setBulkAction({ type: 'INACTIVE', isOpen: true });
          }}
          onClearSelection={() => setSelectedIds(new Set())}
          isPending={bulkUpdateMutation.isPending}
        />
      )}

      {/* Bulk Action Confirmation Modal */}
      {isAdmin && (
        <ConfirmDialog
          isOpen={bulkAction !== null && bulkAction.isOpen}
          title={`${bulkAction?.type === 'ACTIVE' ? 'Activate' : 'Deactivate'} Job Roles`}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0 }}>
                Are you sure you want to {bulkAction?.type === 'ACTIVE' ? 'activate' : 'deactivate'}{' '}
                <strong>{selectedIds.size}</strong> selected job role(s)?
              </p>
              {bulkAction?.type === 'INACTIVE' && (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
                  Note: A role cannot be deactivated if it still contains active employees.
                </p>
              )}
              {bulkUpdateMutation.isError && <ErrorAlert error={bulkUpdateMutation.error} />}
            </div>
          }
          confirmLabel={bulkAction?.type === 'ACTIVE' ? 'Activate' : 'Deactivate'}
          isPending={bulkUpdateMutation.isPending}
          onConfirm={handleBulkConfirm}
          onCancel={handleBulkCancel}
        />
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

