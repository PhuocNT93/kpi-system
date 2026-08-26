import { useDeactivateTeam, useTeamById } from '../hooks/useTeams';
import { ConfirmDialog, ErrorAlert, LoadingSpinner } from '../../../shared/components/ui';
import type { OrgTeam } from '../domain/organization-models';

interface TeamDeactivateDialogProps {
  team: OrgTeam | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TeamDeactivateDialog({ team, isOpen, onClose }: TeamDeactivateDialogProps) {
  const deactivationMutation = useDeactivateTeam();
  
  // Fetch detailed info to know the active member count
  const teamDetailQuery = useTeamById(isOpen ? team?.id : undefined);

  if (!isOpen || !team) return null;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Deactivate Team"
      description={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p>
            Are you sure you want to deactivate <strong>{team.name}</strong>?
          </p>
          
          {teamDetailQuery.isPending && <LoadingSpinner label="Checking team status..." />}
          {teamDetailQuery.isError && <ErrorAlert error={teamDetailQuery.error} />}
          
          {teamDetailQuery.isSuccess && teamDetailQuery.data.activeMemberCount > 0 && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '4px', color: '#991b1b' }}>
              <strong>Warning:</strong> This team has <strong>{teamDetailQuery.data.activeMemberCount}</strong> active employee(s).
              You must reassign them to a different team before deactivating this one.
            </div>
          )}
          
          {deactivationMutation.isError && <ErrorAlert error={deactivationMutation.error} />}
        </div>
      }
      confirmLabel="Deactivate"
      isPending={deactivationMutation.isPending}
      disabled={teamDetailQuery.isPending || (teamDetailQuery.isSuccess && teamDetailQuery.data.activeMemberCount > 0)}
      onConfirm={async () => {
        try {
          await deactivationMutation.mutateAsync(team.id);
          onClose();
        } catch {
          // Error handled by mutation and displayed in dialog
        }
      }}
      onCancel={() => {
        deactivationMutation.reset();
        onClose();
      }}
    />
  );
}
