import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDepartments } from '../hooks/useDepartments';
import { useTeams } from '../hooks/useTeams';
import { DepartmentTable } from './DepartmentTable';
import { TeamTable } from './TeamTable';
import { EmployeeTable } from './EmployeeTable';
import { TeamFormulaBuilderTab } from './TeamFormulaBuilderTab';
import { formulaApi } from '../api/formula-api';
import { Building, Users, ChevronRight, ChevronDown, Folder, Sliders, Shield, Award } from 'lucide-react';
import { LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { SubTabs, type SubTabItem } from '../../../shared/ui/SubTabs/SubTabs';
import { Button } from '../../../shared/ui/Button/Button';
import { useAuth } from '../../../shared/auth/auth-context';
import type { CreateControl } from './create-control';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

export type SelectionNode =
  | { type: 'root' }
  | { type: 'department'; id: string; name: string }
  | { type: 'team'; id: string; name: string; departmentId: string };

// One sub-tab choice shared by every tree level, so switching department or team keeps
// the same view when it exists there and falls back to the level's first sub-tab otherwise.
export type OrgStructureSubTabId = 'departments' | 'teams' | 'employees' | 'members' | 'formula';

export function OrgStructureTab() {
  const departmentsQuery = useDepartments();
  const teamsQuery = useTeams();
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();

  const [selection, setSelection] = useState<SelectionNode>({ type: 'root' });
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [preferredSubTab, setPreferredSubTab] = useState<OrgStructureSubTabId>('departments');
  // The create button sits beside the sub-tabs; the active table still owns its create dialog.
  const [createOpenFor, setCreateOpenFor] = useState<OrgStructureSubTabId | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';

  // Query formula summary to know which team / department has custom formula
  const formulasSummaryQuery = useQuery({
    queryKey: ['formulas-summary'],
    queryFn: () => formulaApi.getFormulasSummary(),
  });

  const formulasSummary = formulasSummaryQuery.data ?? [];
  const customFormulaTeamIds = new Set(
    formulasSummary.filter((f) => f.is_custom_override && f.team_id).map((f) => f.team_id as string)
  );
  const customFormulaDeptIds = new Set(
    formulasSummary.filter((f) => f.is_custom_override && f.department_id && !f.team_id).map((f) => f.department_id as string)
  );

  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);

  useEffect(() => {
    if (departments.length > 0) {
      const engDept = departments.find(
        (d) => d.code === 'DEPT-ENG' || d.name.toLowerCase().includes('engineering')
      );
      if (engDept) {
        setExpandedDepts((prev) => {
          if (prev.has(engDept.id)) return prev;
          const next = new Set(prev);
          next.add(engDept.id);
          return next;
        });
      }
    }
  }, [departments]);

  if (departmentsQuery.isPending || teamsQuery.isPending) return <LoadingSpinner />;
  if (departmentsQuery.isError) return <ErrorAlert error={departmentsQuery.error} onRetry={() => departmentsQuery.refetch()} />;
  if (teamsQuery.isError) return <ErrorAlert error={teamsQuery.error} onRetry={() => teamsQuery.refetch()} />;

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
  const mutedTextColor = isDark ? '#94a3b8' : '#6b7280';

  const formulaTab: SubTabItem<OrgStructureSubTabId> = {
    id: 'formula',
    label: t('org.subtab.formula', 'Evaluation Formula'),
    icon: <Sliders size={14} />,
  };
  const subTabItems: SubTabItem<OrgStructureSubTabId>[] =
    selection.type === 'root'
      ? [
          { id: 'departments', label: t('org.subtab.departments', 'Departments'), icon: <Building size={14} /> },
          { id: 'employees', label: t('org.subtab.employees', 'Employees'), icon: <Users size={14} /> },
        ]
      : selection.type === 'department'
        ? [
            { id: 'teams', label: t('org.subtab.teams', 'Teams'), icon: <Folder size={14} /> },
            { id: 'employees', label: t('org.subtab.employees', 'Employees'), icon: <Users size={14} /> },
            formulaTab,
          ]
        : [{ id: 'members', label: t('org.subtab.members', 'Members'), icon: <Users size={14} /> }, formulaTab];
  const activeSubTab = subTabItems.some((item) => item.id === preferredSubTab) ? preferredSubTab : subTabItems[0].id;
  const createControlFor = (subTab: OrgStructureSubTabId): CreateControl => ({
    isOpen: createOpenFor === subTab,
    onOpenChange: (isOpen) => setCreateOpenFor(isOpen ? subTab : null),
  });
  const createLabels: Partial<Record<OrgStructureSubTabId, string>> = {
    departments: t('org.action.create_department', '+ Create Department'),
    teams: t('org.action.create_team', '+ Create Team'),
    employees: t('org.action.add_employee', '+ Add Employee'),
    members: t('org.action.add_employee', '+ Add Employee'),
  };
  const createLabel = isAdmin ? createLabels[activeSubTab] : undefined;
  const subTabBar = (
    <SubTabs<OrgStructureSubTabId>
      level={3}
      ariaLabel={t('tab_org_structure', 'Org Structure')}
      value={activeSubTab}
      onChange={setPreferredSubTab}
      items={subTabItems}
      actions={
        createLabel && (
          <Button id={`create-${activeSubTab}-btn`} size="sm" onClick={() => setCreateOpenFor(activeSubTab)}>
            {createLabel}
          </Button>
        )
      }
    />
  );

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
          <span
            title={t('org.structure.root', 'Organization Overview')}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
          >
            {t('org.structure.root', 'Organization Overview')}
          </span>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          {departments.map((dept) => {
            const deptTeams = teams.filter((t) => t.departmentId === dept.id);
            const isExpanded = expandedDepts.has(dept.id);
            const isDeptSelected = selection.type === 'department' && selection.id === dept.id;
            const hasDeptCustom = customFormulaDeptIds.has(dept.id);

            return (
              <div key={dept.id}>
                {/* Department Node */}
                <div
                  style={getTreeItemStyle(isDeptSelected)}
                  onClick={() => {
                    setSelection({ type: 'department', id: dept.id, name: dept.name });
                  }}
                >
                  <div onClick={(e) => toggleDept(dept.id, e)} style={{ display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer' }}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                  <Folder size={16} style={{ color: isDeptSelected ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#64748b' : '#9ca3af') }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{dept.name}</span>
                  
                  {hasDeptCustom && (
                    <span
                      title="Phòng ban này có công thức đánh giá riêng"
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe',
                        color: isDark ? '#38bdf8' : '#0369a1',
                        border: `1px solid ${isDark ? '#0284c7' : '#bae6fd'}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      CT Dept
                    </span>
                  )}
                </div>

                {/* Team Nodes */}
                {isExpanded && (
                  <div style={{ paddingLeft: '2.5rem' }}>
                    {deptTeams.length === 0 ? (
                      <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: mutedTextColor, fontStyle: 'italic' }}>
                        No teams
                      </div>
                    ) : (
                      deptTeams.map((team) => {
                        const isTeamSelected = selection.type === 'team' && selection.id === team.id;
                        const hasTeamCustom = customFormulaTeamIds.has(team.id);

                        return (
                          <div
                            key={team.id}
                            style={getTreeItemStyle(isTeamSelected)}
                            onClick={() => {
                              setSelection({ type: 'team', id: team.id, name: team.name, departmentId: dept.id });
                            }}
                          >
                            <Users size={14} style={{ color: isTeamSelected ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#64748b' : '#9ca3af') }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{team.name}</span>
                            
                            {/* Subtle formula badge */}
                            {hasTeamCustom ? (
                              <span
                                title="Team này có công thức đánh giá riêng"
                                style={{
                                  fontSize: '0.625rem',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
                                  color: isDark ? '#6ee7b7' : '#059669',
                                  border: `1px solid ${isDark ? '#059669' : '#a7f3d0'}`,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                CT Riêng
                              </span>
                            ) : hasDeptCustom ? (
                              <span
                                title="Team này kế thừa công thức từ phòng ban"
                                style={{
                                  fontSize: '0.625rem',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#f0f9ff',
                                  color: isDark ? '#38bdf8' : '#0284c7',
                                  border: `1px solid ${isDark ? '#0284c7' : '#bae6fd'}`,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Theo Dept
                              </span>
                            ) : (
                              <span
                                title="Team này kế thừa mặc định công ty"
                                style={{
                                  fontSize: '0.625rem',
                                  fontWeight: 500,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: isDark ? 'rgba(100, 116, 139, 0.15)' : '#f1f5f9',
                                  color: isDark ? '#94a3b8' : '#64748b',
                                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Mặc định
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Content based on selection. Only the active table (or the formula editor) scrolls. */}
      <div className="org-content-panel org-card fill-column" style={{ backgroundColor: panelBg, border: panelBorder }}>
        {/* ROOT: All Organization (Organization Structure overview) */}
        {selection.type === 'root' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: headingColor }}>{t('org.structure.root', 'Organization Overview')}</h2>
            </div>
            {subTabBar}
            {activeSubTab === 'departments' && <DepartmentTable createControl={createControlFor('departments')} />}
            {activeSubTab === 'employees' && <EmployeeTable createControl={createControlFor('employees')} />}
          </>
        )}

        {/* DEPARTMENT: Department View (Has Formula Tab applying to ALL teams in Department) */}
        {selection.type === 'department' && (
          <>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: mutedTextColor, fontSize: '0.875rem', flexShrink: 0 }}>
              <Building size={16} />
              <span style={{ cursor: 'pointer' }} onClick={() => setSelection({ type: 'root' })}>{t('org.structure.root', 'Organization Overview')}</span>
              <ChevronRight size={14} />
              <Folder size={16} color={isDark ? '#60a5fa' : '#1d4ed8'} />
              <span style={{ color: headingColor, fontWeight: 500 }}>{selection.name}</span>
            </div>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: headingColor }}>
                  Department: {selection.name}
                </h2>
                {customFormulaDeptIds.has(selection.id) ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe',
                      color: isDark ? '#38bdf8' : '#0369a1',
                      border: `1px solid ${isDark ? '#0284c7' : '#bae6fd'}`,
                    }}
                  >
                    <Award size={13} />
                    ⭐ Đang áp dụng công thức riêng phòng ban
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      color: isDark ? '#94a3b8' : '#64748b',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    }}
                  >
                    <Shield size={13} />
                    🛡️ Kế thừa mặc định công ty
                  </span>
                )}
              </div>
            </div>
            {subTabBar}
            {activeSubTab === 'teams' && <TeamTable departmentId={selection.id} createControl={createControlFor('teams')} />}
            {activeSubTab === 'employees' && <EmployeeTable departmentId={selection.id} createControl={createControlFor('employees')} />}
            {activeSubTab === 'formula' && (
              <div className="table-scroll-frame">
                <TeamFormulaBuilderTab
                  departmentId={selection.id}
                  departmentName={selection.name}
                  onFormulaUpdated={() => formulasSummaryQuery.refetch()}
                />
              </div>
            )}
          </>
        )}

        {/* TEAM: When clicking into a specific team -> ALLOW CREATING & MANAGING TEAM FORMULA */}
        {selection.type === 'team' && (
          <>
            {/* Breadcrumbs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: mutedTextColor, fontSize: '0.875rem', flexShrink: 0 }}>
              <Building size={16} />
              <span style={{ cursor: 'pointer' }} onClick={() => setSelection({ type: 'root' })}>{t('org.structure.root', 'Organization Overview')}</span>
              <ChevronRight size={14} />
              <Folder size={16} />
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const parentDept = departments.find((d) => d.id === selection.departmentId);
                  if (parentDept) setSelection({ type: 'department', id: parentDept.id, name: parentDept.name });
                }}
              >
                {departments.find((d) => d.id === selection.departmentId)?.name || 'Department'}
              </span>
              <ChevronRight size={14} />
              <Users size={16} color={isDark ? '#60a5fa' : '#1d4ed8'} />
              <span style={{ color: headingColor, fontWeight: 600 }}>{selection.name}</span>
            </div>
            
            {/* Team Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: headingColor }}>
                    Team: {selection.name}
                  </h2>
                </div>

                {customFormulaTeamIds.has(selection.id) ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
                      color: isDark ? '#6ee7b7' : '#059669',
                      border: `1px solid ${isDark ? '#059669' : '#a7f3d0'}`,
                    }}
                  >
                    <Award size={13} />
                    ⭐ Đang áp dụng công thức riêng của team
                  </span>
                ) : customFormulaDeptIds.has(selection.departmentId) ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#f0f9ff',
                      color: isDark ? '#38bdf8' : '#0369a1',
                      border: `1px solid ${isDark ? '#0284c7' : '#bae6fd'}`,
                    }}
                  >
                    <Building size={13} />
                    🏢 Kế thừa từ Department ({departments.find((d) => d.id === selection.departmentId)?.name || 'Engineering'})
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      color: isDark ? '#94a3b8' : '#64748b',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    }}
                  >
                    <Shield size={13} />
                    🛡️ Đang dùng công thức mặc định công ty
                  </span>
                )}
              </div>
            </div>
            {subTabBar}
            {activeSubTab === 'members' && (
              <EmployeeTable departmentId={selection.departmentId} teamId={selection.id} createControl={createControlFor('members')} />
            )}
            {activeSubTab === 'formula' && (
              <div className="table-scroll-frame">
                <TeamFormulaBuilderTab
                  teamId={selection.id}
                  teamName={selection.name}
                  departmentId={selection.departmentId}
                  departmentName={departments.find((d) => d.id === selection.departmentId)?.name}
                  onFormulaUpdated={() => formulasSummaryQuery.refetch()}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
