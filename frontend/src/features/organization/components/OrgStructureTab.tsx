import { useState } from 'react';
import { useDepartments } from '../hooks/useDepartments';
import { useTeams } from '../hooks/useTeams';
import { DepartmentTable } from './DepartmentTable';
import { TeamTable } from './TeamTable';
import { EmployeeTable } from './EmployeeTable';
import { Building, Users, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

export type SelectionNode =
  | { type: 'root' }
  | { type: 'department'; id: string; name: string }
  | { type: 'team'; id: string; name: string; departmentId: string };

export function OrgStructureTab() {
  const departmentsQuery = useDepartments();
  const teamsQuery = useTeams();
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();

  const [selection, setSelection] = useState<SelectionNode>({ type: 'root' });
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  if (departmentsQuery.isPending || teamsQuery.isPending) return <LoadingSpinner />;
  if (departmentsQuery.isError) return <ErrorAlert error={departmentsQuery.error} onRetry={() => departmentsQuery.refetch()} />;
  if (teamsQuery.isError) return <ErrorAlert error={teamsQuery.error} onRetry={() => teamsQuery.refetch()} />;

  const departments = departmentsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  const toggleDept = (deptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  const panelBg = isDark ? '#1e293b' : '#ffffff';
  const panelBorder = isDark ? '1px solid #334155' : '1px solid #e5e7eb';
  const headingColor = isDark ? '#f8fafc' : '#111827';
  const subHeadingColor = isDark ? '#cbd5e1' : '#374151';
  const mutedTextColor = isDark ? '#94a3b8' : '#6b7280';
  const dividerColor = isDark ? '#334155' : '#e5e7eb';

  const getTreeItemStyle = (active: boolean) => ({
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: active ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : 'transparent',
    color: active ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#cbd5e1' : '#4b5563'),
    fontWeight: active ? 600 : 400,
    transition: 'all 0.2s',
    marginBottom: '2px',
  });

  return (
    <div className="org-structure-layout">
      {/* Left Sidebar: Tree View */}
      <div className="org-tree-sidebar org-card" style={{ backgroundColor: panelBg, border: panelBorder }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: mutedTextColor, letterSpacing: '0.05em' }}>
          {t('org_tree', 'Organization Tree')}
        </h3>
        
        {/* Root: All Employees */}
        <div
          style={getTreeItemStyle(selection.type === 'root')}
          onClick={() => setSelection({ type: 'root' })}
        >
          <Building size={16} />
          <span>{t('all_departments', 'All Organization')}</span>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          {departments.map((dept) => {
            const deptTeams = teams.filter(t => t.departmentId === dept.id);
            const isExpanded = expandedDepts.has(dept.id);
            
            return (
              <div key={dept.id}>
                {/* Department Node */}
                <div
                  style={getTreeItemStyle(selection.type === 'department' && selection.id === dept.id)}
                  onClick={() => setSelection({ type: 'department', id: dept.id, name: dept.name })}
                >
                  <div onClick={(e) => toggleDept(dept.id, e)} style={{ display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer' }}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                  <Folder size={16} style={{ color: selection.type === 'department' && selection.id === dept.id ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#64748b' : '#9ca3af') }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</span>
                </div>

                {/* Team Nodes */}
                {isExpanded && (
                  <div style={{ paddingLeft: '2.5rem' }}>
                    {deptTeams.length === 0 ? (
                      <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: mutedTextColor, fontStyle: 'italic' }}>
                        No teams
                      </div>
                    ) : (
                      deptTeams.map(team => (
                        <div
                          key={team.id}
                          style={getTreeItemStyle(selection.type === 'team' && selection.id === team.id)}
                          onClick={() => setSelection({ type: 'team', id: team.id, name: team.name, departmentId: dept.id })}
                        >
                          <Users size={14} style={{ color: selection.type === 'team' && selection.id === team.id ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#64748b' : '#9ca3af') }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Content based on selection */}
      <div className="org-content-panel org-card" style={{ backgroundColor: panelBg, border: panelBorder }}>
        {selection.type === 'root' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Building size={20} color={isDark ? '#94a3b8' : '#6b7280'} />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: headingColor }}>{t('all_departments', 'All Organization')}</h2>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: subHeadingColor, borderBottom: `1px solid ${dividerColor}`, paddingBottom: '0.5rem' }}>
                {t('all_departments', 'Departments')}
              </h3>
              <DepartmentTable />
            </div>

            <div>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: subHeadingColor, borderBottom: `1px solid ${dividerColor}`, paddingBottom: '0.5rem' }}>
                {t('employees', 'All Employees')}
              </h3>
              <EmployeeTable />
            </div>
          </div>
        )}

        {selection.type === 'department' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: mutedTextColor, fontSize: '0.875rem' }}>
              <Building size={16} />
              <span>{t('all_departments', 'All Organization')}</span>
              <ChevronRight size={14} />
              <Folder size={16} color={isDark ? '#60a5fa' : '#1d4ed8'} />
              <span style={{ color: headingColor, fontWeight: 500 }}>{selection.name}</span>
            </div>
            
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 600, color: headingColor }}>
              Department: {selection.name}
            </h2>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: subHeadingColor, borderBottom: `1px solid ${dividerColor}`, paddingBottom: '0.5rem' }}>
                Teams in this Department
              </h3>
              <TeamTable departmentId={selection.id} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: subHeadingColor, borderBottom: `1px solid ${dividerColor}`, paddingBottom: '0.5rem' }}>
                Employees in {selection.name}
              </h3>
              <EmployeeTable departmentId={selection.id} />
            </div>
          </div>
        )}

        {selection.type === 'team' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: mutedTextColor, fontSize: '0.875rem' }}>
              <Building size={16} />
              <span>{t('all_departments', 'All Organization')}</span>
              <ChevronRight size={14} />
              <Folder size={16} />
              <span>{departments.find(d => d.id === selection.departmentId)?.name || 'Department'}</span>
              <ChevronRight size={14} />
              <Users size={16} color={isDark ? '#60a5fa' : '#1d4ed8'} />
              <span style={{ color: headingColor, fontWeight: 500 }}>{selection.name}</span>
            </div>
            
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 600, color: headingColor }}>
              Team: {selection.name}
            </h2>
            
            <div>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: subHeadingColor, borderBottom: `1px solid ${dividerColor}`, paddingBottom: '0.5rem' }}>
                Team Members
              </h3>
              <EmployeeTable departmentId={selection.departmentId} teamId={selection.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
