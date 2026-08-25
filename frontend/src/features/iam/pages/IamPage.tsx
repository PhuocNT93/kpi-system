import { NavLink, Outlet } from 'react-router-dom';
import { UserTable } from '../components/UserTable';
import { RoleTable } from '../components/RoleTable';
import { PermissionTable } from '../components/PermissionTable';

const TAB_LINKS = [
  { to: '/admin/iam/users', label: 'Users' },
  { to: '/admin/iam/roles', label: 'Roles' },
  { to: '/admin/iam/permissions', label: 'Permissions' },
];

export function IamPage() {
  return (
    <main>
      <h1 style={{ margin: '0 0 1.5rem' }}>Identity &amp; Access Management</h1>
      <nav
        aria-label="IAM sections"
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

export function UsersPage() {
  return (
    <section aria-labelledby="users-section-heading">
      <h2 id="users-section-heading" style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Users</h2>
      <UserTable />
    </section>
  );
}

export function RolesPage() {
  return (
    <section aria-labelledby="roles-section-heading">
      <h2 id="roles-section-heading" style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Roles</h2>
      <RoleTable />
    </section>
  );
}

export function PermissionsPage() {
  return (
    <section aria-labelledby="permissions-section-heading">
      <h2 id="permissions-section-heading" style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Permissions</h2>
      <PermissionTable />
    </section>
  );
}
