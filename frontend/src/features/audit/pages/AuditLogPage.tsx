import React, { useState } from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { ErrorAlert, LoadingSpinner } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { COLORS } from '../../../lib/theme';
import { RADII, TYPOGRAPHY, useTheme } from '../../../shared/theme';
import { ShieldAlert, Building2, ShieldCheck, ChevronLeft, ChevronRight, Lock, SearchX } from 'lucide-react';
import { useAuth } from '../../../shared/auth/auth-context';
import { AuditFilterBar } from '../components/AuditFilterBar';
import { AuditTable } from '../components/AuditTable';
import { AuditDetailModal } from '../components/AuditDetailModal';
import { useUiTranslation } from '../../../shared/i18n/ui-i18n';
import type { WireAuditLog } from '../api/audit-types';

interface AuditLogPageProps {
  // Set when rendered inside a hub that already shows its own title and role.
  isEmbedded?: boolean;
}

export function AuditLogPage({ isEmbedded = false }: AuditLogPageProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [entityId, setEntityId] = useState('');
  const [entityIdInput, setEntityIdInput] = useState('');
  const [selectedLog, setSelectedLog] = useState<WireAuditLog | null>(null);

  const isHrAdmin = user?.role === 'HR_ADMIN';
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const isUnauthorizedRole = !isHrAdmin && !isSystemAdmin;

  const filters = { page, limit, entityType, action, entityId };
  const logsQuery = useAuditLogs(filters);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'entityId') {
      setEntityIdInput(value);
      return;
    }
    setPage(1);
    if (name === 'entityType') setEntityType(value);
    if (name === 'action') setAction(value);
  };

  const handleSearch = () => {
    const trimmed = entityIdInput.trim();
    if (page === 1 && trimmed === entityId) {
      logsQuery.refetch();
      return;
    }
    setPage(1);
    setEntityId(trimmed);
  };

  const handleResetFilters = () => {
    setPage(1);
    setEntityType('');
    setAction('');
    setEntityId('');
    setEntityIdInput('');
  };

  const handleNextPage = () => setPage((p) => p + 1);
  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));

  const totalPages = logsQuery.data?.total ? Math.ceil(logsQuery.data.total / limit) : 1;

  // Check for 403 Forbidden error
  const isForbidden = isUnauthorizedRole || (logsQuery.error as { status?: number; code?: string })?.status === 403;

  return (
    <main
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: isEmbedded ? 0 : '12px',
        color: isDark ? '#f8fafc' : COLORS.neutral[900],
      }}
    >
      {/* Header & Role Scope Banner */}
      {!isEmbedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: RADII.lg,
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                  color: isDark ? '#93c5fd' : COLORS.primary[600],
                }}
              >
                <ShieldAlert size={24} />
              </span>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: TYPOGRAPHY.fontSize.xl,
                    fontWeight: TYPOGRAPHY.fontWeight.bold,
                    color: isDark ? '#f8fafc' : COLORS.neutral[900],
                  }}
                >
                  {t('auditPageTitle', 'System Audit Logs')}
                </h1>
                <p
                  style={{
                    margin: '3px 0 0 0',
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    color: isDark ? '#94a3b8' : COLORS.neutral[500],
                  }}
                >
                  {t(
                    'auditPageSubtitle',
                    'Immutable history of business operations, configurations, and score calculations (Read-Only)'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Role Scope Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isSystemAdmin && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.85rem',
                  borderRadius: RADII.full,
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  fontWeight: 600,
                  backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#ede9fe',
                  color: isDark ? '#c4b5fd' : '#6d28d9',
                  border: isDark ? '1px solid rgba(124, 58, 237, 0.4)' : '1px solid #ddd6fe',
                }}
              >
                <ShieldCheck size={16} />
                <span>{t('auditRoleSystemAdmin', 'System Admin (Full Audit Access)')}</span>
              </div>
            )}

            {isHrAdmin && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.85rem',
                  borderRadius: RADII.full,
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  fontWeight: 600,
                  backgroundColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe',
                  color: isDark ? '#7dd3fc' : '#0369a1',
                  border: isDark ? '1px solid rgba(2, 132, 199, 0.4)' : '1px solid #bae6fd',
                }}
              >
                <Building2 size={16} />
                <span>{t('auditRoleHrAdmin', 'HR Admin (Scoped to Business Entities)')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 403 Forbidden State */}
      {isForbidden ? (
        <div
          role="alert"
          style={{
            background: isDark ? 'rgba(225, 29, 72, 0.15)' : '#fff1f2',
            border: isDark ? '1px solid rgba(225, 29, 72, 0.35)' : '1px solid #fecdd3',
            borderRadius: RADII.lg,
            padding: '2rem',
            textAlign: 'center',
            color: isDark ? '#fda4af' : '#9f1239',
            marginTop: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: isDark ? 'rgba(225, 29, 72, 0.25)' : '#ffe4e6',
                color: isDark ? '#fb7185' : '#e11d48',
              }}
            >
              <Lock size={24} />
            </span>
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: 700 }}>
            {t('unauthorizedTitle')}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: TYPOGRAPHY.fontSize.sm,
              color: isDark ? '#fecdd3' : '#be123c',
              maxWidth: '540px',
              marginInline: 'auto',
            }}
          >
            {t('unauthorizedDesc')}
          </p>
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <AuditFilterBar
            entityType={entityType}
            action={action}
            entityId={entityIdInput}
            isHrAdmin={isHrAdmin}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            onSearch={handleSearch}
          />

          {/* Loading & Error States */}
          {logsQuery.isPending && <LoadingSpinner label={t('loadError')} />}
          {logsQuery.isError && <ErrorAlert error={logsQuery.error} onRetry={() => logsQuery.refetch()} />}

          {/* Content Table */}
          {logsQuery.isSuccess && (
            <>
              {logsQuery.data.logs.length === 0 ? (
                <div
                  role="status"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4rem 2rem',
                    gap: '1rem',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9',
                      color: isDark ? '#475569' : '#94a3b8',
                    }}
                  >
                    <SearchX size={28} />
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      color: isDark ? '#e2e8f0' : '#334155',
                    }}
                  >
                    {t('emptyDesc')}
                  </p>
                </div>
              ) : (
                <AuditTable logs={logsQuery.data.logs} onSelectLog={(log) => setSelectedLog(log)} />
              )}

              {/* Pagination Toolbar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: isDark ? '#94a3b8' : '#64748b' }}>
                  {t('recordsLabel')}: <strong>{logsQuery.data.logs.length}</strong> / <strong>{logsQuery.data.total}</strong> &bull; {t('pageLabel')}{' '}
                  <strong>{page}</strong> {t('ofLabel')} <strong>{totalPages}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Button
                    onClick={handlePrevPage}
                    disabled={page === 1}
                    variant="outlined"
                    size="sm"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ChevronLeft size={16} />
                      {t('prevBtn')}
                    </span>
                  </Button>
                  <Button
                    onClick={handleNextPage}
                    disabled={page >= totalPages}
                    variant="outlined"
                    size="sm"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {t('nextBtn')}
                      <ChevronRight size={16} />
                    </span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Read-Only Detail Modal */}
      <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </main>
  );
}
