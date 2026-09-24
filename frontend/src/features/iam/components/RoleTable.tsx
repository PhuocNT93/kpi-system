import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRoles, useCreateRole, useUpdateRole } from '../hooks/useRoles';
import { ErrorAlert, LoadingSpinner, EmptyState } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import type { IamRole } from '../domain/iam-models';
import { AutoCodeButton } from '../../../shared/components/AutoCodeButton';
import { generateCode } from '../../../shared/utils/code-generator';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import {
  Search,
  X,
  Shield,
  ShieldCheck,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Edit2,
} from 'lucide-react';

const roleSchema = z.object({
  code: z.string().min(1, 'Code is required').regex(/^[A-Z_]+$/, 'Code must be UPPERCASE_SNAKE_CASE'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

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

interface RoleFormDialogProps {
  isOpen: boolean;
  role?: IamRole;
  onClose: () => void;
}

function RoleFormDialog({ isOpen, role, onClose }: RoleFormDialogProps) {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const isEditMode = role !== undefined;
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole(role?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const { register, watch, setValue, handleSubmit, reset, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: role
      ? { code: role.code, name: role.name, description: role.description ?? '' }
      : { code: '', name: '', description: '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        role
          ? { code: role.code, name: role.name, description: role.description ?? '' }
          : { code: '', name: '', description: '' },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, role?.id]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    if (isEditMode) {
      await updateMutation.mutateAsync({ name: values.name, description: values.description });
    } else {
      await createMutation.mutateAsync(values);
    }
    onClose();
  });

  const inputStyle = {
    display: 'block',
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
    background: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: '0.875rem',
    boxSizing: 'border-box' as const,
    outline: 'none',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-form-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: 440,
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
        }}
      >
        <h2 id="role-form-dialog-title" style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
          {isEditMode ? t('iam.roles.edit_role', 'Edit Role') : t('iam.roles.create_role', 'Create Role')}
        </h2>

        {mutationError && <ErrorAlert error={mutationError} />}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label htmlFor="role-code" style={{ fontSize: '0.85rem', fontWeight: 500, color: isDark ? '#cbd5e1' : '#374151' }}>
                {t('iam.roles.code', 'Code')} * (e.g. HR_ADMIN)
              </label>
              {!isEditMode && (
                <AutoCodeButton
                  onClick={() => {
                    const code = generateCode('ROLE', watch('name')).replace(/-/g, '_');
                    setValue('code', code);
                  }}
                />
              )}
            </div>
            <input
              id="role-code"
              type="text"
              aria-required="true"
              disabled={isEditMode}
              {...register('code')}
              style={{
                ...inputStyle,
                opacity: isEditMode ? 0.6 : 1,
                cursor: isEditMode ? 'not-allowed' : 'text',
              }}
            />
            {errors.code && <span role="alert" style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '0.2rem', display: 'block' }}>{errors.code.message}</span>}
          </div>

          <div>
            <label htmlFor="role-name" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500, color: isDark ? '#cbd5e1' : '#374151' }}>
              {t('iam.roles.name', 'Name')} *
            </label>
            <input id="role-name" type="text" aria-required="true" {...register('name')} style={inputStyle} />
            {errors.name && <span role="alert" style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '0.2rem', display: 'block' }}>{errors.name.message}</span>}
          </div>

          <div>
            <label htmlFor="role-description" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500, color: isDark ? '#cbd5e1' : '#374151' }}>
              {t('iam.roles.description', 'Description')}
            </label>
            <textarea id="role-description" {...register('description')} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('common.saving', 'Saving…') : isEditMode ? t('common.save_changes', 'Save Changes') : t('iam.roles.create_btn', 'Create Role')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RoleTable() {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  const rolesQuery = useRoles();
  const [editingRole, setEditingRole] = useState<IamRole | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const ALLOWED_CORE_ROLES = ['SYSTEM_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'];
  const allRoles = useMemo(() => {
    const roles = rolesQuery.data ?? [];
    return roles
      .filter((r) => ALLOWED_CORE_ROLES.includes(r.code.toUpperCase()))
      .sort((a, b) => {
        const orderA = ALLOWED_CORE_ROLES.indexOf(a.code.toUpperCase());
        const orderB = ALLOWED_CORE_ROLES.indexOf(b.code.toUpperCase());
        return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
      });
  }, [rolesQuery.data]);

  // Filter roles based on search query
  const filteredRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRoles;
    return allRoles.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [allRoles, searchQuery]);

  if (rolesQuery.isPending) return <LoadingSpinner label={t('iam.roles.loading', 'Loading roles…')} />;
  if (rolesQuery.isError) return <ErrorAlert error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />;

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

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
              backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : '#faf5ff',
              color: isDark ? '#c084fc' : '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {t('iam.roles.heading', 'Roles')}
            </div>
            <div style={{ fontSize: '0.775rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              {filteredRoles.length} / {allRoles.length} {t('iam.roles.roles_count', 'roles')}
            </div>
          </div>
        </div>

        <Button
          id="create-role-btn"
          onClick={() => setIsCreateOpen(true)}
          size="sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Plus size={15} />
          <span>{t('iam.roles.create_btn', 'Create Role')}</span>
        </Button>
      </div>

      {/* ── Search Bar & View Mode Toggle ───────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '380px' }}>
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
            placeholder={t('iam.roles.search_placeholder', 'Search by code, name, description...')}
            aria-label="Search roles"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.5rem 2.25rem 0.5rem 2.25rem',
              fontSize: '0.85rem',
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
      {filteredRoles.length === 0 ? (
        <EmptyState message={t('iam.roles.empty', 'No roles found matching your criteria.')} />
      ) : viewMode === 'table' ? (
        /* Desktop / Tablet Table View */
        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
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
                  {t('iam.roles.col_code', 'Code')}
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.775rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('iam.roles.col_name', 'Name')}
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.775rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('iam.roles.col_description', 'Description')}
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.775rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('iam.roles.col_permissions', 'Permissions')}
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.775rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  {t('iam.roles.col_actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role, idx) => {
                const roleStyle = getRoleStyle(role.code);
                const permCount = (role.permissionCodes || []).length;
                return (
                  <tr
                    key={role.id}
                    style={{
                      borderBottom: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
                      backgroundColor: idx % 2 === 1 ? (isDark ? 'rgba(15, 23, 42, 0.25)' : '#fafafa') : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Role Code */}
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
                        {role.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', fontSize: '0.875rem' }}>
                      {role.name}
                    </td>

                    {/* Description */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', fontSize: '0.825rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                      {role.description || '—'}
                    </td>

                    {/* Assigned Checkpoints Badge */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: permCount > 0 ? (isDark ? 'rgba(6, 78, 59, 0.35)' : '#ecfdf5') : (isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc'),
                          color: permCount > 0 ? (isDark ? '#34d399' : '#047857') : (isDark ? '#64748b' : '#94a3b8'),
                          border: permCount > 0 ? `1px solid ${isDark ? '#065f46' : '#a7f3d0'}` : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        }}
                      >
                        <ShieldCheck size={12} />
                        <span>
                          {permCount} {t('iam.roles.checkpoints_assigned', 'assigned')}
                        </span>
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                      <Button
                        variant="outlined"
                        size="sm"
                        aria-label={`Edit ${role.name}`}
                        onClick={() => setEditingRole(role)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <Edit2 size={12} />
                        <span>{t('common.edit', 'Edit')}</span>
                      </Button>
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
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
            width: '100%',
          }}
        >
          {filteredRoles.map((role) => {
            const roleStyle = getRoleStyle(role.code);
            const permCount = (role.permissionCodes || []).length;
            return (
              <div
                key={role.id}
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
                    {role.code}
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      backgroundColor: permCount > 0 ? (isDark ? 'rgba(6, 78, 59, 0.35)' : '#ecfdf5') : (isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc'),
                      color: permCount > 0 ? (isDark ? '#34d399' : '#047857') : (isDark ? '#64748b' : '#94a3b8'),
                      border: permCount > 0 ? `1px solid ${isDark ? '#065f46' : '#a7f3d0'}` : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    }}
                  >
                    <ShieldCheck size={11} />
                    <span>{permCount}</span>
                  </span>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {role.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.4 }}>
                    {role.description || '—'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: `1px solid ${isDark ? '#334155' : '#f1f5f9'}` }}>
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={() => setEditingRole(role)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    <Edit2 size={12} />
                    <span>{t('common.edit', 'Edit')}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RoleFormDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <RoleFormDialog isOpen={editingRole !== undefined} role={editingRole} onClose={() => setEditingRole(undefined)} />
    </div>
  );
}
