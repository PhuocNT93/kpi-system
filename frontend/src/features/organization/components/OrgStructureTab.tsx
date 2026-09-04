import { useState } from 'react';
import { useDepartments } from '../hooks/useDepartments';
import { useTeams } from '../hooks/useTeams';
import { DepartmentTable } from './DepartmentTable';
import { TeamTable } from './TeamTable';
import { EmployeeTable } from './EmployeeTable';
import { Building, Users, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';

export type SelectionNode =
  | { type: 'root' }
  | { type: 'department'; id: string; name: string }
  | { type: 'team'; id: string; name: string; departmentId: string };

export function OrgStructureTab() {
  const departmentsQuery = useDepartments();
  const teamsQuery = useTeams();

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

  const getTreeItemStyle = (active: boolean) => ({
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: active ? '#eff6ff' : 'transparent',
    color: active ? '#1d4ed8' : '#4b5563',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.2s',
    marginBottom: '2px',
  });

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
      {/* Left Sidebar: Tree View */}
      <div style={{ width: '300px', flexShrink: 0, backgroundColor: '#fff', borderRadius: '8px', padding: '1rem', border: '1px solid #e5e7eb', minHeight: '500px' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>
          Organization Tree
        </h3>
        
        {/* Root: All Employees */}
        <div
          style={getTreeItemStyle(selection.type === 'root')}
          onClick={() => setSelection({ type: 'root' })}
        >
          <Building size={16} />
          <span>All Organization</span>
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
                  <Folder size={16} style={{ color: selection.type === 'department' && selection.id === dept.id ? '#1d4ed8' : '#9ca3af' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</span>
                </div>

                {/* Team Nodes */}
                {isExpanded && (
                  <div style={{ paddingLeft: '2.5rem' }}>
                    {deptTeams.length === 0 ? (
                      <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: '#9ca3af', fontStyle: 'italic' }}>
                        No teams
                      </div>
                    ) : (
                      deptTeams.map(team => (
                        <div
                          key={team.id}
                          style={getTreeItemStyle(selection.type === 'team' && selection.id === team.id)}
                          onClick={() => setSelection({ type: 'team', id: team.id, name: team.name, departmentId: dept.id })}
                        >
                          <Users size={14} style={{ color: selection.type === 'team' && selection.id === team.id ? '#1d4ed8' : '#9ca3af' }} />
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
      <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e5e7eb', minWidth: 0 }}>
        {selection.type === 'root' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Building size={20} color="#6b7280" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>All Organization</h2>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Departments</h3>
              <DepartmentTable />
            </div>

            <div>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>All Employees</h3>
              <EmployeeTable />
            </div>
          </div>
        )}

        {selection.type === 'department' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
              <Building size={16} />
              <span>All Organization</span>
              <ChevronRight size={14} />
              <Folder size={16} color="#1d4ed8" />
              <span style={{ color: '#111827', fontWeight: 500 }}>{selection.name}</span>
            </div>
            
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Department: {selection.name}</h2>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Teams in this Department</h3>
              {/* Note: TeamTable needs a departmentId filter prop if we want to filter */}
              <TeamTable departmentId={selection.id} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Employees in {selection.name}</h3>
              <EmployeeTable departmentId={selection.id} />
            </div>
          </div>
        )}

        {selection.type === 'team' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
              <Building size={16} />
              <span>All Organization</span>
              <ChevronRight size={14} />
              <Folder size={16} />
              <span>{departments.find(d => d.id === selection.departmentId)?.name || 'Department'}</span>
              <ChevronRight size={14} />
              <Users size={16} color="#1d4ed8" />
              <span style={{ color: '#111827', fontWeight: 500 }}>{selection.name}</span>
            </div>
            
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Team: {selection.name}</h2>
            
            <div>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Team Members</h3>
              <EmployeeTable departmentId={selection.departmentId} teamId={selection.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
