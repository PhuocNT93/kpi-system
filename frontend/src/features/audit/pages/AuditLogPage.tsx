import React, { useState } from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { ErrorAlert, LoadingSpinner, EmptyState } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { COLORS } from '../../../lib/theme';
import { RADII, TYPOGRAPHY, useTheme } from '../../../shared/theme';
import { ShieldAlert, Building2, ShieldCheck, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '../../../shared/auth/auth-context';
import { AuditFilterBar } from '../components/AuditFilterBar';
import { AuditTable } from '../components/AuditTable';
import { AuditDetailModal } from '../components/AuditDetailModal';
import { useUiTranslation } from '../../../shared/i18n/ui-i18n';
import type { WireAuditLog } from '../api/audit-types';

export function AuditLogPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useUiTranslation();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [entityId, setEntityId] = useState('');
  const [selectedLog, setSelectedLog] = useState<WireAuditLog | null>(null);

  const isHrAdmin = user?.role === 'HR_ADMIN';
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const isUnauthorizedRole = !isHrAdmin && !isSystemAdmin;

  const filters = { page, limit, entityType, action, entityId };
  const logsQuery = useAuditLogs(filters);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setPage(1); // reset to page 1 on filter change
    if (name === 'entityType') setEntityType(value);
    if (name === 'action') setAction(value);
    if (name === 'entityId') setEntityId(value);
  };

  const handleResetFilters = () => {
    setPage(1);
    setEntityType('');
    setAction('');
    setEntityId('');
  };

  const handleNextPage = () => setPage((p) => p + 1);
  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));

  const totalPages = logsQuery.data?.total ? Math.ceil(logsQuery.data.total / limit) : 1;

  // Check for 403 Forbidden error
  const isForbidden = isUnauthorizedRole || (logsQuery.error as { status?: number; code?: string })?.status === 403;

  return (
    <main
      style={{
        padding: '12px',
        color: isDark ? '#f8fafc' : COLORS.neutral[900],
      }}
    >
      {/* Header & Role Scope Banner */}
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
                {t('pageTitle')}
              </h1>
              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  color: isDark ? '#94a3b8' : COLORS.neutral[500],
                }}
              >
                {t('pageSubtitle')}
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
              <span>{t('roleSystemAdmin')}</span>
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
              <span>{t('roleHrAdmin')}</span>
            </div>
          )}
        </div>
      </div>

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
            entityId={entityId}
            isHrAdmin={isHrAdmin}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {/* Loading & Error States */}
          {logsQuery.isPending && <LoadingSpinner label={t('loadError')} />}
          {logsQuery.isError && <ErrorAlert error={logsQuery.error} onRetry={() => logsQuery.refetch()} />}

          {/* Content Table */}
          {logsQuery.isSuccess && (
            <>
              {logsQuery.data.logs.length === 0 ? (
                <EmptyState message={t('emptyDesc')} />
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
