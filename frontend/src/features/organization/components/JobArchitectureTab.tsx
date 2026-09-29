import { useState } from 'react';
import { OrgRoleTable } from './OrgRoleTable';
import { JobLevelTable } from './JobLevelTable';
import { ReviewCadenceTable } from './ReviewCadenceTable';
import { Briefcase, Layers, Calendar } from 'lucide-react';
import { useTheme } from '../../../shared/theme';
import { SubTabs } from '../../../shared/ui/SubTabs/SubTabs';
import { Button } from '../../../shared/ui/Button/Button';
import { useAuth } from '../../../shared/auth/auth-context';
import type { CreateControl } from './create-control';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

type JobArchitectureSubTab = 'roles' | 'levels' | 'cadences';

export function JobArchitectureTab() {
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const [subTab, setSubTab] = useState<JobArchitectureSubTab>('roles');
  // The create button sits beside the sub-tabs; the active table still owns its create dialog.
  const [createOpenFor, setCreateOpenFor] = useState<JobArchitectureSubTab | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  const createControlFor = (id: JobArchitectureSubTab): CreateControl => ({
    isOpen: createOpenFor === id,
    onOpenChange: (isOpen) => setCreateOpenFor(isOpen ? id : null),
  });

  const sections = {
    roles: {
      title: t('job_roles', 'Job Roles'),
      description: t('job_roles_desc', 'Manage roles and functional areas across the organization.'),
      createLabel: t('btn_create_role', '+ Create Role'),
      table: <OrgRoleTable createControl={createControlFor('roles')} />,
    },
    levels: {
      title: t('job_levels', 'Job Levels'),
      description: t('job_levels_desc', 'Manage seniority levels and ranking scales.'),
      createLabel: t('btn_create_level', '+ Create Level'),
      table: <JobLevelTable createControl={createControlFor('levels')} />,
    },
    cadences: {
      title: t('review_cadences', 'Review Cadences'),
      description: t('review_cadences_desc', 'Configure evaluation intervals and cycles for job levels and individual overrides.'),
      createLabel: t('btn_create_cadence', '+ Create Cadence'),
      table: <ReviewCadenceTable createControl={createControlFor('cadences')} />,
    },
  } satisfies Record<JobArchitectureSubTab, unknown>;
  const section = sections[subTab];

  // Same layout as the Org Structure content panel: sub-tabs and the create button inside the card.
  return (
    <div className="fill-column">
      <div
        className="org-card fill-column"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
          boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <SubTabs<JobArchitectureSubTab>
          level={3}
          ariaLabel={t('tab_job_architecture', 'Job Architecture')}
          value={subTab}
          onChange={setSubTab}
          items={[
            { id: 'roles', label: sections.roles.title, icon: <Briefcase size={14} /> },
            { id: 'levels', label: sections.levels.title, icon: <Layers size={14} /> },
            { id: 'cadences', label: sections.cadences.title, icon: <Calendar size={14} /> },
          ]}
          actions={
            isAdmin && (
              <Button id={`create-${subTab}-btn`} size="sm" onClick={() => setCreateOpenFor(subTab)}>
                {section.createLabel}
              </Button>
            )
          }
        />
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#6b7280', flexShrink: 0 }}>
          {section.description}
        </p>
        {section.table}
      </div>
    </div>
  );
}
