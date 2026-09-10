import { useState, useRef, useEffect } from 'react';
import { useTeams, useBulkUpdateTeams } from '../hooks/useTeams';
import { useAuth } from '../../../shared/auth/auth-context';
import { TeamFormModal } from './TeamFormModal';
import { TeamDeactivateDialog } from './TeamDeactivateDialog';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgTeam } from '../domain/organization-models';
import { BulkActionBar } from './BulkActionBar';

export function TeamTable({ departmentId }: { departmentId?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  const filters: Record<string, string> = {};
  if (departmentId) filters.department_id = departmentId;

  const teamsQuery = useTeams(filters);
  const [editingTeam, setEditingTeam] = useState<OrgTeam | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deactivatingTeam, setDeactivatingTeam] = useState<OrgTeam | null>(null);

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ type: 'ACTIVE' | 'INACTIVE'; isOpen: boolean } | null>(null);
  const bulkUpdateMutation = useBulkUpdateTeams();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const teams = teamsQuery.data ?? [];

  const isAllSelected = teams.length > 0 && selectedIds.size === teams.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < teams.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(teams.map((t) => t.id)));
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
        teamIds: Array.from(selectedIds),
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

  if (teamsQuery.isPending) return <LoadingSpinner label="Loading teams…" />;
  if (teamsQuery.isError) return <ErrorAlert error={teamsQuery.error} onRetry={() => teamsQuery.refetch()} />;

  return (
    <div style={{ paddingBottom: '6rem' }}>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button id="create-team-btn" onClick={() => setIsCreateOpen(true)} size="sm">
            + Create Team
          </Button>
        </div>
      )}

      {teams.length === 0 ? (
        <EmptyState message="No teams found." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                {isAdmin && (
                  <th style={{ padding: '0.75rem 1rem', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      ref={headerCheckboxRef}
                      checked={isAllSelected}
                      onChange={handleToggleAll}
                      aria-label="Select all teams"
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const isSelected = selectedIds.has(team.id);
                return (
                  <tr
                    key={team.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: isSelected ? '#eff6ff' : undefined,
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {isAdmin && (
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(team.id)}
                          aria-label={`Select team ${team.name}`}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                    )}
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{team.code}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{team.name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge status={team.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <Button
                          variant="outlined"
                          size="sm"
                          aria-label={`Edit team ${team.name}`}
                          onClick={() => setEditingTeam(team)}
                        >
                          Edit
                        </Button>
                        {team.isActive && (
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Deactivate team ${team.name}`}
                            onClick={() => setDeactivatingTeam(team)}
                          >
                            Deactivate
                          </Button>
                        )}
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
          entityName={selectedIds.size === 1 ? 'team' : 'teams'}
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
          title={`${bulkAction?.type === 'ACTIVE' ? 'Activate' : 'Deactivate'} Teams`}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0 }}>
                Are you sure you want to {bulkAction?.type === 'ACTIVE' ? 'activate' : 'deactivate'}{' '}
                <strong>{selectedIds.size}</strong> selected team(s)?
              </p>
              {bulkAction?.type === 'INACTIVE' ? (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
                  Note: A team cannot be deactivated if it still contains active employees.
                </p>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
                  Note: A team can only be activated if its parent department is active.
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
        <TeamFormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* Edit Dialog */}
      {isAdmin && (
        <TeamFormModal
          isOpen={editingTeam !== undefined}
          team={editingTeam}
          onClose={() => setEditingTeam(undefined)}
        />
      )}

      {/* Deactivate Dialog */}
      {isAdmin && (
        <TeamDeactivateDialog
          team={deactivatingTeam}
          isOpen={deactivatingTeam !== null}
          onClose={() => setDeactivatingTeam(null)}
        />
      )}
    </div>
  );
}

