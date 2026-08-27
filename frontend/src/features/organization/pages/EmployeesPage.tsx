import { EmployeeTable } from '../components/EmployeeTable';

export function EmployeesPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Employees</h1>
        <p style={{ margin: 0, color: '#4b5563' }}>Manage employees in the organization.</p>
      </header>

      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <EmployeeTable />
      </div>
    </div>
  );
}
