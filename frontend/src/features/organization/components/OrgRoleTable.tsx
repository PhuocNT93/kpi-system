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
import { Search } from 'lucide-react';
import { useTableHeaderOffset } from '@/shared/hooks/use-table-header-offset';
import type { CreateControl } from './create-control';

export function OrgRoleTable({ createControl }: { createControl?: CreateControl } = {}) {
  const tableFrameRef = useTableHeaderOffset<HTMLDivElement>();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const rolesQuery = useJobRoles();
  const [editingRole, setEditingRole] = useState<OrgJobRole | undefined>();
  const [ownCreateOpen, setOwnCreateOpen] = useState(false);
  const isCreateOpen = createControl?.isOpen ?? ownCreateOpen;
  const setIsCreateOpen = createControl?.onOpenChange ?? setOwnCreateOpen;

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ type: 'ACTIVE' | 'INACTIVE'; isOpen: boolean } | null>(null);
  const bulkUpdateMutation = useBulkUpdateJobRoles();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const roles = (rolesQuery.data ?? []).filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

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
    position: 'sticky',
    top: 0,
    backgroundColor: isDark ? '#0f172a' : '#f9fafb',
    zIndex: 1,
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: isDark ? '#f8fafc' : '#111827',
  };

  // Only the table scrolls; the extra bottom space keeps the last row clear of the fixed bulk action bar.
  return (
    <div style={{ paddingBottom: selectedIds.size > 0 ? '5rem' : '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_roles', 'Tìm chức danh...')}
            style={{
              width: '100%',
              padding: '6px 12px 6px 30px',
              fontSize: '0.8125rem',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              color: isDark ? '#f8fafc' : '#111827',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {isAdmin && (
          <Button id="create-role-btn" onClick={() => setIsCreateOpen(true)} size="sm">
            {t('btn_create_role', '+ Thêm chức danh')}
          </Button>
        )}
      </div>

      {roles.length === 0 ? (
        <EmptyState message={t('empty_roles', 'Không tìm thấy chức danh nào.')} />
      ) : (
        <div ref={tableFrameRef} className="table-scroll-frame" style={{ paddingBottom: selectedIds.size > 0 ? '6rem' : 0 }}>
          <table style={{ width: '100%', minWidth: '540px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: `2px solid ${isDark ? '#334155' : '#e5e7eb'}`,
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
                <th style={thStyle}>{t('org.col.status', 'Status')}</th>
                {isAdmin && <th style={{ ...thStyle, width: '150px' }}>{t('org.col.actions', 'Actions')}</th>}
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

