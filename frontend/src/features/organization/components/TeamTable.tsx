import { useState } from 'react';
import { useTeams } from '../hooks/useTeams';
import { useAuth } from '../../../shared/auth/auth-context';
import { TeamFormModal } from './TeamFormModal';
import { TeamDeactivateDialog } from './TeamDeactivateDialog';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgTeam } from '../domain/organization-models';

export function TeamTable({ departmentId }: { departmentId?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  const filters: Record<string, string> = {};
  if (departmentId) filters.department_id = departmentId;

  const teamsQuery = useTeams(filters);
  const [editingTeam, setEditingTeam] = useState<OrgTeam | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deactivatingTeam, setDeactivatingTeam] = useState<OrgTeam | null>(null);

  if (teamsQuery.isPending) return <LoadingSpinner label="Loading teams…" />;
  if (teamsQuery.isError) return <ErrorAlert error={teamsQuery.error} onRetry={() => teamsQuery.refetch()} />;

  const teams = teamsQuery.data ?? [];

  return (
    <div>
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
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
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
              ))}
            </tbody>
          </table>
        </div>
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

