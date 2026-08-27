import { NavLink, Outlet } from 'react-router-dom';

const TAB_LINKS = [
  { to: '/admin/organization/departments', label: 'Departments' },
  { to: '/admin/organization/teams', label: 'Teams' },
  { to: '/admin/organization/roles', label: 'Job Roles' },
  { to: '/admin/organization/levels', label: 'Job Levels' },
  { to: '/admin/organization/employees', label: 'Employees' },
];

export function OrganizationPage() {
  return (
    <main>
      <h1 style={{ margin: '0 0 1.5rem' }}>Organization Management</h1>
      <nav
        aria-label="Organization sections"
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb' }}
      >
        {TAB_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              padding: '0.5rem 1rem', textDecoration: 'none',
              borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
              color: isActive ? '#2563eb' : '#374151',
              fontWeight: isActive ? 600 : 400, marginBottom: -2,
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </main>
  );
}
