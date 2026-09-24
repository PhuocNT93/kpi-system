import { NavLink, Outlet } from 'react-router-dom';
import { UserTable } from '../components/UserTable';
import { RoleTable } from '../components/RoleTable';
import { PermissionTable } from '../components/PermissionTable';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';

export function IamPage() {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  const tabLinks = [
    { to: '/admin/iam/users', label: t('iam.tabs.users', 'Users') },
    { to: '/admin/iam/roles', label: t('iam.tabs.roles', 'Roles') },
    { to: '/admin/iam/permissions', label: t('iam.tabs.permissions', 'Permissions') },
  ];

  return (
    <main style={{ width: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ margin: '0 0 1.5rem', color: isDark ? '#f8fafc' : '#0f172a' }}>
        {t('iam.title', 'Identity & Access Management')}
      </h1>
      <nav
        aria-label="IAM sections"
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: `2px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {tabLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              padding: '0.5rem 1rem',
              textDecoration: 'none',
              borderBottom: isActive ? `2px solid ${isDark ? '#60a5fa' : '#2563eb'}` : '2px solid transparent',
              color: isActive ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#374151'),
              fontWeight: isActive ? 600 : 400,
              marginBottom: -2,
              whiteSpace: 'nowrap',
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
    <section aria-label="Users management">
      <UserTable />
    </section>
  );
}

export function RolesPage() {
  return (
    <section aria-label="Roles management">
      <RoleTable />
    </section>
  );
}

export function PermissionsPage() {
  return (
    <section aria-label="Permissions management">
      <PermissionTable />
    </section>
  );
}
