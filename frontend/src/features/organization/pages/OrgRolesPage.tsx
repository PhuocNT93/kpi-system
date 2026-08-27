import { OrgRoleTable } from '../components/OrgRoleTable';

export function OrgRolesPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Job Roles</h1>
        <p style={{ margin: 0, color: '#4b5563' }}>Manage standard job roles for employees.</p>
      </header>

      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <OrgRoleTable />
      </div>
    </div>
  );
}
