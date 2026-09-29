import { useState, useMemo } from 'react';
import { useUsers, useToggleUserStatus } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { UserFormDialog } from './UserFormDialog';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { IamUser } from '../domain/iam-models';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useTableHeaderOffset } from '@/shared/hooks/use-table-header-offset';
import {
  Search,
  X,
  LayoutGrid,
  Table as TableIcon,
  Users,
  Edit2,
  Power,
} from 'lucide-react';
import { FilterField } from '@/shared/ui/FilterField/FilterField';
import { FILTER_CONTROL_HEIGHT, useFilterControlStyle } from '@/shared/ui/FilterField/use-filter-control-style';

const ROLE_BADGE_STYLES: Record<string, { bg: string; darkBg: string; text: string; darkText: string; border: string; darkBorder: string }> = {
  SYSTEM_ADMIN: {
    bg: '#f5f3ff',
    darkBg: 'rgba(88, 28, 135, 0.3)',
    text: '#6d28d9',
    darkText: '#c084fc',
    border: '#ddd6fe',
    darkBorder: '#6b21a8',
  },
  HR_ADMIN: {
    bg: '#eff6ff',
    darkBg: 'rgba(30, 58, 138, 0.3)',
    text: '#1d4ed8',
    darkText: '#60a5fa',
    border: '#bfdbfe',
    darkBorder: '#1e40af',
  },
  MANAGER: {
    bg: '#fffbeb',
    darkBg: 'rgba(120, 53, 15, 0.3)',
    text: '#b45309',
    darkText: '#fbbf24',
    border: '#fde68a',
    darkBorder: '#92400e',
  },
  EMPLOYEE: {
    bg: '#ecfdf5',
    darkBg: 'rgba(6, 78, 59, 0.3)',
    text: '#047857',
    darkText: '#34d399',
    border: '#a7f3d0',
    darkBorder: '#065f46',
  },
};

export function UserTable() {
  const tableFrameRef = useTableHeaderOffset<HTMLDivElement>();
  const { controlStyle } = useFilterControlStyle();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  const usersQuery = useUsers();
  const rolesQuery = useRoles();

  const [editingUser, setEditingUser] = useState<IamUser | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<IamUser | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const toggleMutation = useToggleUserStatus(
    pendingToggle?.id ?? '',
    pendingToggle?.isActive ?? false,
  );

  const allUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const allRoles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  // Filter users based on search, role, and status
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allUsers.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleCode.toLowerCase().includes(q);

      const matchesRole = selectedRole === 'ALL' || u.roleCode.toUpperCase() === selectedRole.toUpperCase();

      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && u.isActive) ||
        (selectedStatus === 'INACTIVE' && !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, searchQuery, selectedRole, selectedStatus]);

  if (usersQuery.isPending) return <LoadingSpinner label={t('iam.users.loading', 'Loading users…')} />;
  if (usersQuery.isError) return <ErrorAlert error={usersQuery.error} onRetry={() => usersQuery.refetch()} />;

  const getRoleStyle = (code: string) => {
    return (
      ROLE_BADGE_STYLES[code.toUpperCase()] || {
        bg: '#f1f5f9',
        darkBg: 'rgba(51, 65, 85, 0.4)',
        text: '#475569',
        darkText: '#cbd5e1',
        border: '#cbd5e1',
        darkBorder: '#475569',
      }
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
      {/* ── Top Header Toolbar ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              padding: '0.45rem',
              borderRadius: '8px',
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
              color: isDark ? '#60a5fa' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {t('iam.users.heading', 'Users')}
            </div>
            <div style={{ fontSize: '0.775rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              {filteredUsers.length} / {allUsers.length} {t('iam.users.users_count', 'users')}
            </div>
          </div>
        </div>

        {/* Same look as the organization create buttons ("+ Create Department"). */}
        <Button id="create-user-btn" onClick={() => setIsCreateOpen(true)} size="sm">
          + {t('iam.users.create_btn', 'Create User')}
        </Button>
      </div>

      {/* ── Search, Filters & View Mode ──────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', flex: '1 1 300px' }}>
          {/* Search Input */}
          <FilterField id="iam-user-search" label={t('iam.filter.search', 'Search')} flex="1 1 260px" maxWidth="420px">
            <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: isDark ? '#64748b' : '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('iam.users.search_placeholder', 'Search by name, email, role...')}
              id="iam-user-search"
            aria-label="Search users"
              style={{ ...controlStyle, padding: '0 2.25rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '0.625rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDark ? '#94a3b8' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          </FilterField>

          {/* Role Filter */}
          <FilterField id="iam-user-role" label={t('iam.filter.role', 'Role')}>
            <select
              id="iam-user-role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              aria-label="Filter by role"
              style={{ ...controlStyle, cursor: 'pointer' }}
            >
              <option value="ALL">{t('iam.users.all_roles', 'All Roles')}</option>
              {allRoles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name} ({role.code})
                </option>
              ))}
            </select>
          </FilterField>

          {/* Status Filter */}
          <FilterField id="iam-user-status" label={t('iam.filter.status', 'Status')}>
            <select
              id="iam-user-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              aria-label="Filter by status"
              style={{ ...controlStyle, cursor: 'pointer' }}
            >
              <option value="ALL">{t('common.all_statuses', 'All Statuses')}</option>
              <option value="ACTIVE">{t('common.active', 'Active')}</option>
              <option value="INACTIVE">{t('common.inactive', 'Inactive')}</option>
            </select>
          </FilterField>
        </div>

        {/* View Mode Switcher */}
        <div
          style={{
            display: 'flex',
            // Same height as the filter controls so it lines up with them.
            height: FILTER_CONTROL_HEIGHT,
            boxSizing: 'border-box',
            alignItems: 'stretch',
            borderRadius: '8px',
            padding: '2px',
            backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('table')}
            title="Table View"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.775rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: viewMode === 'table' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
              color: viewMode === 'table' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
              boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <TableIcon size={14} />
            <span>Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            title="Cards View"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.775rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: viewMode === 'cards' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
              color: viewMode === 'cards' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
              boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* ── Content View ────────────────────────────────────────────── */}
      {filteredUsers.length === 0 ? (
        <EmptyState message={t('iam.users.empty', 'No users found matching your criteria.')} />
      ) : viewMode === 'table' ? (
        /* Desktop / Tablet Table View */
        <div
          ref={tableFrameRef}
          className="table-scroll-frame"
          style={{
            width: '100%',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '12px',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderBottom: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                }}
              >
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.775rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('iam.users.col_name', 'Name')}
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.775rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('iam.users.col_email', 'Email')}
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.775rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('iam.users.col_role', 'Role')}
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.775rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('iam.users.col_status', 'Status')}
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.775rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  {t('iam.users.col_actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => {
                const roleStyle = getRoleStyle(user.roleCode);
                return (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
                      backgroundColor: idx % 2 === 1 ? (isDark ? 'rgba(15, 23, 42, 0.25)' : '#fafafa') : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* User Name & Avatar */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: isDark ? '#334155' : '#e2e8f0',
                            color: isDark ? '#f8fafc' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                          {user.name}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', fontSize: '0.825rem', color: isDark ? '#cbd5e1' : '#475569' }}>
                      {user.email}
                    </td>

                    {/* Role Badge */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          backgroundColor: isDark ? roleStyle.darkBg : roleStyle.bg,
                          color: isDark ? roleStyle.darkText : roleStyle.text,
                          border: `1px solid ${isDark ? roleStyle.darkBorder : roleStyle.border}`,
                        }}
                      >
                        {user.roleCode}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          size="sm"
                          aria-label={`${t('common.edit', 'Edit')} ${user.name}`}
                          title={t('common.edit', 'Edit')}
                          onClick={() => setEditingUser(user)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', lineHeight: 0 }}
                        >
                          <Edit2 size={14} aria-hidden="true" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`${user.isActive ? t('iam.users.deactivate', 'Deactivate') : t('iam.users.activate', 'Activate')} ${user.name}`}
                          title={user.isActive ? t('iam.users.deactivate', 'Deactivate') : t('iam.users.activate', 'Activate')}
                          onClick={() => setPendingToggle(user)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.375rem',
                            lineHeight: 0,
                            color: user.isActive ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#34d399' : '#059669'),
                            backgroundColor: isDark
                              ? (user.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)')
                              : (user.isActive ? '#fef2f2' : '#ecfdf5'),
                            border: isDark
                              ? (user.isActive ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)')
                              : (user.isActive ? '1px solid #fecaca' : '1px solid #a7f3d0'),
                          }}
                        >
                          <Power size={14} aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Mobile / Cards View */
        <div
          className="table-scroll-frame"
          style={{
            alignContent: 'start',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
            width: '100%',
          }}
        >
          {filteredUsers.map((user) => {
            const roleStyle = getRoleStyle(user.roleCode);
            return (
              <div
                key={user.id}
                style={{
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  padding: '1.125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: isDark ? '#334155' : '#e2e8f0',
                        color: isDark ? '#f8fafc' : '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.925rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: `1px solid ${isDark ? '#334155' : '#f1f5f9'}` }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      backgroundColor: isDark ? roleStyle.darkBg : roleStyle.bg,
                      color: isDark ? roleStyle.darkText : roleStyle.text,
                      border: `1px solid ${isDark ? roleStyle.darkBorder : roleStyle.border}`,
                    }}
                  >
                    {user.roleCode}
                  </span>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="outlined"
                      size="sm"
                      aria-label={`${t('common.edit', 'Edit')} ${user.name}`}
                      title={t('common.edit', 'Edit')}
                      onClick={() => setEditingUser(user)}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', lineHeight: 0 }}
                    >
                      <Edit2 size={14} aria-hidden="true" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`${user.isActive ? t('iam.users.deactivate', 'Deactivate') : t('iam.users.activate', 'Activate')} ${user.name}`}
                      title={user.isActive ? t('iam.users.deactivate', 'Deactivate') : t('iam.users.activate', 'Activate')}
                      onClick={() => setPendingToggle(user)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.375rem',
                        lineHeight: 0,
                        color: user.isActive ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#34d399' : '#059669'),
                        backgroundColor: isDark
                          ? (user.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)')
                          : (user.isActive ? '#fef2f2' : '#ecfdf5'),
                        border: isDark
                          ? (user.isActive ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)')
                          : (user.isActive ? '1px solid #fecaca' : '1px solid #a7f3d0'),
                      }}
                    >
                      <Power size={14} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <UserFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit Dialog */}
      <UserFormDialog
        isOpen={editingUser !== undefined}
        user={editingUser}
        onClose={() => setEditingUser(undefined)}
      />

      {/* Confirm toggle active status */}
      <ConfirmDialog
        isOpen={pendingToggle !== null}
        title={pendingToggle?.isActive ? t('iam.users.deactivate_title', 'Deactivate User') : t('iam.users.activate_title', 'Activate User')}
        description={
          pendingToggle?.isActive
            ? `${t('iam.users.deactivate_confirm', 'Deactivate')} ${pendingToggle?.name}? ${t('iam.users.deactivate_notice', 'They will no longer be able to log in.')}`
            : `${t('iam.users.activate_confirm', 'Activate')} ${pendingToggle?.name}? ${t('iam.users.activate_notice', 'They will be able to log in again.')}`
        }
        confirmLabel={pendingToggle?.isActive ? t('iam.users.deactivate', 'Deactivate') : t('iam.users.activate', 'Activate')}
        isPending={toggleMutation.isPending}
        onConfirm={async () => {
          await toggleMutation.mutateAsync();
          setPendingToggle(null);
        }}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
}
