import { useState, useMemo } from 'react';
import { usePermissions, useRoles, useAssignPermission, useRevokePermission } from '../hooks/useRoles';
import { ErrorAlert, LoadingSpinner, EmptyState } from '../../../shared/components/ui';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import type { IamRole } from '../domain/iam-models';
import {
  Check,
  Minus,
  Search,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
  Loader2,
  Filter,
  X,
  Lock,
} from 'lucide-react';

// Only allow configuration for these 4 core roles
const ALLOWED_CORE_ROLES = ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] as const;

// Visual configuration for the 4 core roles
const ROLE_CONFIG: Record<
  string,
  {
    label: string;
    description: string;
    color: string;
    darkColor: string;
    bg: string;
    darkBg: string;
    border: string;
    darkBorder: string;
  }
> = {
  SYSTEM_ADMIN: {
    label: 'System Admin',
    description: 'Full system management and configuration',
    color: '#6d28d9',
    darkColor: '#c084fc',
    bg: '#f5f3ff',
    darkBg: 'rgba(88, 28, 135, 0.25)',
    border: '#ddd6fe',
    darkBorder: '#6b21a8',
  },
  HR_ADMIN: {
    label: 'HR Admin',
    description: 'HR operations, employees, and review cycles',
    color: '#1d4ed8',
    darkColor: '#60a5fa',
    bg: '#eff6ff',
    darkBg: 'rgba(30, 58, 138, 0.25)',
    border: '#bfdbfe',
    darkBorder: '#1e40af',
  },
  MANAGER: {
    label: 'Manager',
    description: 'Team evaluations, reviews, and KPI scores',
    color: '#b45309',
    darkColor: '#fbbf24',
    bg: '#fffbeb',
    darkBg: 'rgba(120, 53, 15, 0.25)',
    border: '#fde68a',
    darkBorder: '#92400e',
  },
  EMPLOYEE: {
    label: 'Employee',
    description: 'Self-assessment and personal KPI tracking',
    color: '#047857',
    darkColor: '#34d399',
    bg: '#ecfdf5',
    darkBg: 'rgba(6, 78, 59, 0.25)',
    border: '#a7f3d0',
    darkBorder: '#065f46',
  },
};

export function PermissionTable() {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  const permissionsQuery = usePermissions();
  const rolesQuery = useRoles();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');

  const allPermissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);
  const allRoles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  // Filter ONLY to the 4 allowed core roles in exact defined order
  const targetRoles = useMemo(() => {
    return ALLOWED_CORE_ROLES.map((code) =>
      allRoles.find((r) => r.code.toUpperCase() === code)
    ).filter((r): r is IamRole => Boolean(r));
  }, [allRoles]);

  const getPermModule = (code: string): string => {
    if (code.includes(':')) {
      return code.split(':')[0]!.toLowerCase();
    }
    const parts = code.split('_');
    return (parts[0] || code).toLowerCase();
  };

  // Extract distinct modules from permission codes (e.g. "evaluation:read" -> "evaluation", "review_cadence:read" -> "review_cadence")
  const modules = useMemo(() => {
    const set = new Set<string>();
    allPermissions.forEach((p) => {
      const mod = getPermModule(p.code);
      if (mod) set.add(mod);
    });
    return Array.from(set).sort();
  }, [allPermissions]);

  // Filter permissions based on search and module
  const filteredPermissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPermissions.filter((p) => {
      const matchesSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      const mod = getPermModule(p.code);
      const matchesModule =
        selectedModule === 'ALL' ||
        mod === selectedModule.toLowerCase() ||
        p.code.toLowerCase().startsWith(selectedModule.toLowerCase() + ':') ||
        p.code.toLowerCase().startsWith(selectedModule.toLowerCase() + '_');

      return matchesSearch && matchesModule;
    });
  }, [allPermissions, searchQuery, selectedModule]);

  // Calculate checkpoints count per role
  const roleCheckpointsCount = useMemo(() => {
    const map: Record<string, number> = {};
    targetRoles.forEach((role) => {
      const assigned = new Set(role.permissionCodes || []);
      map[role.id] = allPermissions.filter((p) => assigned.has(p.code)).length;
    });
    return map;
  }, [targetRoles, allPermissions]);

  if (permissionsQuery.isPending || rolesQuery.isPending) {
    return <LoadingSpinner label={t('iam.permissions.loading', 'Loading permissions…')} />;
  }

  if (permissionsQuery.isError) {
    return (
      <ErrorAlert
        error={permissionsQuery.error}
        onRetry={() => permissionsQuery.refetch()}
      />
    );
  }

  if (rolesQuery.isError) {
    return <ErrorAlert error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />;
  }

  if (allPermissions.length === 0) {
    return <EmptyState message={t('iam.permissions.empty', 'No permissions defined.')} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Subtitle & Notice Banner ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              padding: '0.375rem',
              borderRadius: '8px',
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
              color: isDark ? '#60a5fa' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={16} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isDark ? '#f8fafc' : '#0f172a',
              }}
            >
              {t(
                'iam.permissions.only_core_roles',
                'Role-Based Access Control (4 Core Roles)'
              )}
            </div>
            <div
              style={{
                fontSize: '0.775rem',
                color: isDark ? '#94a3b8' : '#64748b',
                marginTop: '0.125rem',
              }}
            >
              {t(
                'iam.permissions.core_roles_desc',
                'Permissions are configurable exclusively for EMPLOYEE, HR_ADMIN, MANAGER, and SYSTEM_ADMIN.'
              )}
            </div>
          </div>
        </div>

        {/* Stats Summary Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            color: isDark ? '#cbd5e1' : '#475569',
            fontWeight: 500,
          }}
        >
          <ShieldCheck size={14} color={isDark ? '#34d399' : '#059669'} />
          <span>
            {filteredPermissions.length} / {allPermissions.length}{' '}
            {t('iam.permissions.permissions_label', 'permissions')}
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>4 {t('iam.permissions.roles_label', 'roles')}</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            flex: '1 1 320px',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 240px',
              maxWidth: '420px',
            }}
          >
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
              placeholder={t(
                'iam.permissions.search_placeholder',
                'Search by code, name, description...'
              )}
              aria-label="Search permissions"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.55rem 2.25rem 0.55rem 2.25rem',
                fontSize: '0.875rem',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                outline: 'none',
              }}
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

          {/* Module Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Filter size={15} color={isDark ? '#94a3b8' : '#64748b'} />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              aria-label="Filter by module"
              style={{
                padding: '0.55rem 0.875rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">{t('iam.permissions.all_modules', 'All Modules')}</option>
              {modules.map((mod) => (
                <option key={mod} value={mod}>
                  {mod.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div
          style={{
            display: 'flex',
            borderRadius: '8px',
            padding: '2px',
            backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            title={t('iam.permissions.view_matrix', 'Matrix View')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              backgroundColor:
                viewMode === 'matrix' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
              color:
                viewMode === 'matrix'
                  ? isDark
                    ? '#60a5fa'
                    : '#2563eb'
                  : isDark
                    ? '#94a3b8'
                    : '#64748b',
              boxShadow:
                viewMode === 'matrix' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <TableIcon size={14} />
            <span className="hidden-on-mobile">{t('iam.permissions.matrix_view', 'Matrix')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            title={t('iam.permissions.view_cards', 'Cards View')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              backgroundColor:
                viewMode === 'cards' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
              color:
                viewMode === 'cards'
                  ? isDark
                    ? '#60a5fa'
                    : '#2563eb'
                  : isDark
                    ? '#94a3b8'
                    : '#64748b',
              boxShadow:
                viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <LayoutGrid size={14} />
            <span className="hidden-on-mobile">{t('iam.permissions.cards_view', 'Cards')}</span>
          </button>
        </div>
      </div>

      {/* ── Content: Matrix View or Card View ──────────────────────── */}
      {filteredPermissions.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            borderRadius: '10px',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px dashed ${isDark ? '#334155' : '#cbd5e1'}`,
            color: isDark ? '#94a3b8' : '#64748b',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.925rem' }}>
            {t('iam.permissions.no_match', 'No permissions match your filter criteria.')}
          </p>
        </div>
      ) : viewMode === 'matrix' ? (
        /* Matrix Table View */
        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: '820px',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderBottom: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                }}
              >
                <th
                  style={{
                    padding: '0.875rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#cbd5e1' : '#475569',
                    width: '28%',
                  }}
                >
                  {t('iam.permissions.col_permission', 'Permission')}
                </th>
                <th
                  style={{
                    padding: '0.875rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#cbd5e1' : '#475569',
                    width: '32%',
                  }}
                >
                  {t('iam.permissions.col_description', 'Description')}
                </th>
                {targetRoles.map((role) => {
                  const cfg = ROLE_CONFIG[role.code.toUpperCase()] || {
                    label: role.code,
                    color: '#2563eb',
                    darkColor: '#60a5fa',
                    bg: '#eff6ff',
                    darkBg: 'rgba(30, 58, 138, 0.25)',
                    border: '#bfdbfe',
                    darkBorder: '#1e40af',
                  };
                  const activeCount = roleCheckpointsCount[role.id] ?? 0;

                  return (
                    <th
                      key={role.id}
                      style={{
                        padding: '0.875rem 0.75rem',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: isDark ? cfg.darkColor : cfg.color,
                        width: '10%',
                        minWidth: '120px',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: isDark ? cfg.darkBg : cfg.bg,
                            border: `1px solid ${isDark ? cfg.darkBorder : cfg.border}`,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {role.code}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            color: isDark ? '#94a3b8' : '#64748b',
                          }}
                        >
                          {activeCount} / {allPermissions.length}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredPermissions.map((perm, idx) => (
                <tr
                  key={perm.id}
                  style={{
                    borderBottom: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
                    backgroundColor:
                      idx % 2 === 1
                        ? isDark
                          ? 'rgba(15, 23, 42, 0.3)'
                          : '#fafafa'
                        : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {/* Code & Name */}
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.775rem',
                          fontWeight: 600,
                          color: isDark ? '#38bdf8' : '#0284c7',
                        }}
                      >
                        {perm.code}
                      </span>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          color: isDark ? '#f8fafc' : '#1e293b',
                        }}
                      >
                        {perm.name}
                      </span>
                    </div>
                  </td>

                  {/* Description */}
                  <td
                    style={{
                      padding: '0.75rem 1rem',
                      verticalAlign: 'middle',
                      fontSize: '0.8125rem',
                      color: isDark ? '#94a3b8' : '#64748b',
                    }}
                  >
                    {perm.description || '—'}
                  </td>

                  {/* Checkpoints for the 4 core roles */}
                  {targetRoles.map((role) => {
                    const isAssigned = (role.permissionCodes || []).includes(perm.code);
                    return (
                      <PermissionCheckpointCell
                        key={role.id}
                        roleId={role.id}
                        roleCode={role.code}
                        permissionCode={perm.code}
                        isAssigned={isAssigned}
                        isDark={isDark}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Responsive Cards View */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
            width: '100%',
          }}
        >
          {filteredPermissions.map((perm) => (
            <div
              key={perm.id}
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
              {/* Card Header */}
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#f0f9ff',
                    color: isDark ? '#38bdf8' : '#0284c7',
                    border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
                    marginBottom: '0.375rem',
                  }}
                >
                  {perm.code}
                </span>
                <h3
                  style={{
                    margin: '0 0 0.25rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                >
                  {perm.name}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: isDark ? '#94a3b8' : '#64748b',
                    lineHeight: 1.4,
                  }}
                >
                  {perm.description || '—'}
                </p>
              </div>

              {/* Checkpoints for the 4 core roles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem',
                  paddingTop: '0.75rem',
                  borderTop: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
                }}
              >
                {targetRoles.map((role) => {
                  const isAssigned = (role.permissionCodes || []).includes(perm.code);
                  return (
                    <PermissionCheckpointCardButton
                      key={role.id}
                      roleId={role.id}
                      roleCode={role.code}
                      permissionCode={perm.code}
                      isAssigned={isAssigned}
                      isDark={isDark}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Check Point Table Cell Component ─────────────────────────────────────────

interface PermissionCheckpointCellProps {
  roleId: string;
  roleCode: string;
  permissionCode: string;
  isAssigned: boolean;
  isDark: boolean;
}

function PermissionCheckpointCell({
  roleId,
  roleCode,
  permissionCode,
  isAssigned,
  isDark,
}: PermissionCheckpointCellProps) {
  const { t } = useUiTranslation();
  const assignMutation = useAssignPermission(roleId);
  const revokeMutation = useRevokePermission(roleId);
  const isPending = assignMutation.isPending || revokeMutation.isPending;

  const handleToggle = async () => {
    if (isPending) return;
    if (isAssigned) {
      await revokeMutation.mutateAsync(permissionCode);
    } else {
      await assignMutation.mutateAsync({ permission_code: permissionCode });
    }
  };

  return (
    <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        title={
          isAssigned
            ? `${roleCode}: ${t('iam.permissions.checkpoint_enabled', 'Enabled Checkpoint')} (Click to revoke)`
            : `${roleCode}: ${t('iam.permissions.checkpoint_disabled', 'Disabled')} (Click to assign)`
        }
        aria-label={`${isAssigned ? 'Revoke' : 'Assign'} ${permissionCode} for ${roleCode}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.7rem',
          borderRadius: '9999px',
          border: isAssigned
            ? `1.5px solid ${isDark ? '#059669' : '#10b981'}`
            : `1.5px dashed ${isDark ? '#475569' : '#cbd5e1'}`,
          backgroundColor: isAssigned
            ? isDark
              ? 'rgba(6, 78, 59, 0.45)'
              : '#ecfdf5'
            : isDark
              ? 'rgba(30, 41, 59, 0.4)'
              : '#f8fafc',
          color: isAssigned
            ? isDark
              ? '#34d399'
              : '#047857'
            : isDark
              ? '#64748b'
              : '#94a3b8',
          cursor: isPending ? 'wait' : 'pointer',
          transition: 'all 0.15s ease',
          fontSize: '0.75rem',
          fontWeight: 600,
          outline: 'none',
        }}
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : isAssigned ? (
          <>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: isDark ? '#10b981' : '#059669',
                color: '#ffffff',
                boxShadow: isDark ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none',
              }}
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span style={{ fontSize: '0.725rem' }}>
              {t('iam.permissions.checkpoint_active', 'Active')}
            </span>
          </>
        ) : (
          <>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: `1px solid ${isDark ? '#64748b' : '#cbd5e1'}`,
                color: isDark ? '#64748b' : '#94a3b8',
              }}
            >
              <Minus size={10} strokeWidth={2.5} />
            </span>
            <span style={{ opacity: 0.7, fontSize: '0.725rem' }}>
              {t('iam.permissions.checkpoint_off', 'Off')}
            </span>
          </>
        )}
      </button>
    </td>
  );
}

// ── Check Point Card Button Component (Mobile / Grid) ────────────────────────

interface PermissionCheckpointCardButtonProps {
  roleId: string;
  roleCode: string;
  permissionCode: string;
  isAssigned: boolean;
  isDark: boolean;
}

function PermissionCheckpointCardButton({
  roleId,
  roleCode,
  permissionCode,
  isAssigned,
  isDark,
}: PermissionCheckpointCardButtonProps) {
  const { t } = useUiTranslation();
  const assignMutation = useAssignPermission(roleId);
  const revokeMutation = useRevokePermission(roleId);
  const isPending = assignMutation.isPending || revokeMutation.isPending;

  const cfg = ROLE_CONFIG[roleCode.toUpperCase()] || {
    label: roleCode,
    color: '#2563eb',
    darkColor: '#60a5fa',
    bg: '#eff6ff',
    darkBg: 'rgba(30, 58, 138, 0.25)',
    border: '#bfdbfe',
    darkBorder: '#1e40af',
  };

  const handleToggle = async () => {
    if (isPending) return;
    if (isAssigned) {
      await revokeMutation.mutateAsync(permissionCode);
    } else {
      await assignMutation.mutateAsync({ permission_code: permissionCode });
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={`${isAssigned ? 'Revoke' : 'Assign'} ${permissionCode} for ${roleCode}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.625rem',
        borderRadius: '8px',
        border: isAssigned
          ? `1.5px solid ${isDark ? '#059669' : '#10b981'}`
          : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        backgroundColor: isAssigned
          ? isDark
            ? 'rgba(6, 78, 59, 0.4)'
            : '#ecfdf5'
          : isDark
            ? '#0f172a'
            : '#f8fafc',
        cursor: isPending ? 'wait' : 'pointer',
        transition: 'all 0.15s ease',
        textAlign: 'left',
        outline: 'none',
      }}
    >
      <span
        style={{
          fontSize: '0.725rem',
          fontWeight: 700,
          color: isDark ? cfg.darkColor : cfg.color,
        }}
      >
        {roleCode}
      </span>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        {isPending ? (
          <Loader2 size={13} className="animate-spin" color={isDark ? '#94a3b8' : '#64748b'} />
        ) : isAssigned ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: isDark ? '#34d399' : '#047857',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: isDark ? '#10b981' : '#059669',
                color: '#ffffff',
              }}
            >
              <Check size={10} strokeWidth={3} />
            </span>
            <span>{t('iam.permissions.checkpoint_on', 'Active')}</span>
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.7rem',
              color: isDark ? '#64748b' : '#94a3b8',
            }}
          >
            <Minus size={11} />
            <span>{t('iam.permissions.checkpoint_off', 'Off')}</span>
          </span>
        )}
      </span>
    </button>
  );
}
