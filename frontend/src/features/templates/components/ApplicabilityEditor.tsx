import { useJobRolesQuery, useTeamsQuery } from '../api/use-templates';
import { MOCK_ROLES, MOCK_TEAMS } from '../api/template-api';

interface ApplicabilityEditorProps {
  applicableRoleIds: string[];
  applicableTeamIds: string[];
  onChange: (roles: string[], teams: string[]) => void;
  isReadOnly?: boolean;
}

export function ApplicabilityEditor({
  applicableRoleIds,
  applicableTeamIds,
  onChange,
  isReadOnly = false,
}: ApplicabilityEditorProps) {
  const rolesQuery = useJobRolesQuery();
  const teamsQuery = useTeamsQuery();

  const roles = rolesQuery.data?.length ? rolesQuery.data : MOCK_ROLES;
  const teams = teamsQuery.data?.length ? teamsQuery.data : MOCK_TEAMS;

  const toggleRole = (roleId: string) => {
    if (isReadOnly) return;
    const nextRoles = applicableRoleIds.includes(roleId)
      ? applicableRoleIds.filter((id) => id !== roleId)
      : [...applicableRoleIds, roleId];
    onChange(nextRoles, applicableTeamIds);
  };

  const toggleTeam = (teamId: string) => {
    if (isReadOnly) return;
    const nextTeams = applicableTeamIds.includes(teamId)
      ? applicableTeamIds.filter((id) => id !== teamId)
      : [...applicableTeamIds, teamId];
    onChange(applicableRoleIds, nextTeams);
  };

  const handleSelectAllRoles = () => {
    if (isReadOnly) return;
    onChange([], applicableTeamIds); // Empty = All roles
  };

  const handleSelectAllTeams = () => {
    if (isReadOnly) return;
    onChange(applicableRoleIds, []); // Empty = All teams
  };

  // Derive semantic text
  const roleNames = roles
    .filter((r) => applicableRoleIds.includes(r.id) || applicableRoleIds.includes(r.code))
    .map((r) => r.name);
  const teamNames = teams
    .filter((t) => applicableTeamIds.includes(t.id) || applicableTeamIds.includes(t.code))
    .map((t) => t.name);

  let semanticText = 'Applies to all employees';
  if (roleNames.length > 0 && teamNames.length > 0) {
    semanticText = `Applies to employees matching: (${roleNames.join(' OR ')}) AND (${teamNames.join(' OR ')})`;
  } else if (roleNames.length > 0) {
    semanticText = `Applies to employees matching Role: (${roleNames.join(' OR ')})`;
  } else if (teamNames.length > 0) {
    semanticText = `Applies to employees matching Team: (${teamNames.join(' OR ')})`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 6,
          padding: '0.625rem 0.75rem',
          fontSize: '0.8125rem',
          color: '#1e40af',
          fontWeight: 600,
        }}
      >
        <strong>Scope Semantic:</strong> {semanticText}
      </div>

      {/* Roles Matrix */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
            Applicable Job Roles
          </label>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleSelectAllRoles}
              style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Reset to All Roles
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {roles.map((r) => {
            const isChecked = applicableRoleIds.includes(r.id) || applicableRoleIds.includes(r.code);
            return (
              <label
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  padding: '0.375rem 0.5rem',
                  background: isChecked ? '#e0e7ff' : '#f9fafb',
                  border: isChecked ? '1px solid #6366f1' : '1px solid #e5e7eb',
                  borderRadius: 4,
                  cursor: isReadOnly ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isReadOnly}
                  onChange={() => toggleRole(r.id)}
                />
                <span style={{ fontWeight: isChecked ? 600 : 400 }}>{r.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Teams Matrix */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
            Applicable Organizational Teams
          </label>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleSelectAllTeams}
              style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Reset to All Teams
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {teams.map((t) => {
            const isChecked = applicableTeamIds.includes(t.id) || applicableTeamIds.includes(t.code);
            return (
              <label
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  padding: '0.375rem 0.5rem',
                  background: isChecked ? '#e0e7ff' : '#f9fafb',
                  border: isChecked ? '1px solid #6366f1' : '1px solid #e5e7eb',
                  borderRadius: 4,
                  cursor: isReadOnly ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isReadOnly}
                  onChange={() => toggleTeam(t.id)}
                />
                <span style={{ fontWeight: isChecked ? 600 : 400 }}>{t.name}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
