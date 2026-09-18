import type { WireAuditLog } from '../api/audit-types';
import { Button } from '../../../shared/ui/Button/Button';
import { COLORS } from '../../../lib/theme';
import { RADII, TYPOGRAPHY, useTheme } from '../../../shared/theme';
import { useUiTranslation } from '../../../shared/i18n/ui-i18n';
import { X, ShieldCheck, Clock, User, FileText, ArrowRight } from 'lucide-react';

interface AuditDetailModalProps {
  log: WireAuditLog | null;
  onClose: () => void;
}

export const AuditDetailModal = ({ log, onClose }: AuditDetailModalProps) => {
  const { isDark } = useTheme();
  const { t, currentLocale } = useUiTranslation();

  if (!log) return null;

  const renderJsonOrText = (val: string | null) => {
    if (val === null || val === undefined) {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>null</span>;
    }
    try {
      const parsed = JSON.parse(val);
      return (
        <pre
          style={{
            margin: 0,
            padding: '0.75rem',
            background: isDark ? '#020617' : '#0f172a',
            color: '#e2e8f0',
            borderRadius: RADII.md,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            overflowX: 'auto',
            maxHeight: '260px',
            border: isDark ? '1px solid #1e293b' : 'none',
          }}
        >
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            background: isDark ? '#0f172a' : '#f8fafc',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            borderRadius: RADII.md,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: isDark ? '#e2e8f0' : '#334155',
            wordBreak: 'break-word',
          }}
        >
          {val}
        </div>
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: isDark ? '#1e293b' : '#ffffff',
          borderRadius: RADII.xl,
          maxWidth: '780px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: RADII.lg,
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                color: isDark ? '#93c5fd' : COLORS.primary[600],
              }}
            >
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2
                id="audit-detail-title"
                style={{
                  margin: 0,
                  fontSize: TYPOGRAPHY.fontSize.lg,
                  fontWeight: TYPOGRAPHY.fontWeight.bold,
                  color: isDark ? '#f8fafc' : COLORS.neutral[900],
                }}
              >
                {t('modalTitle')}
              </h2>
              <span style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                ID: <code style={{ fontFamily: 'monospace' }}>{log.auditLogId}</code> &bull; {t('modalBadge')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('btnClose')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#94a3b8' : '#64748b',
              padding: '4px',
              borderRadius: RADII.sm,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Metadata Section */}
          <div>
            <h3
              style={{
                margin: '0 0 0.75rem 0',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 700,
                color: isDark ? '#93c5fd' : '#1e40af',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Clock size={14} />
              {t('sectionMeta')}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '1rem',
                borderRadius: RADII.lg,
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                  {t('fieldTime')}
                </span>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 500 }}>
                  {new Date(log.performedAt).toLocaleString(currentLocale === 'vi' ? 'vi-VN' : 'en-US')}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                  {t('fieldActor')}
                </span>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 500 }}>
                  {log.performedByName || t('systemActor')}
                </span>
                {log.performedBy && (
                  <div style={{ fontSize: '0.75rem', color: isDark ? '#64748b' : '#94a3b8', fontFamily: 'monospace' }}>
                    {log.performedBy}
                  </div>
                )}
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                  {t('fieldSource')}
                </span>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 500 }}>
                  {log.source || 'API / Transaction'}
                </span>
              </div>
            </div>
          </div>

          {/* Entity & Action Section */}
          <div>
            <h3
              style={{
                margin: '0 0 0.75rem 0',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 700,
                color: isDark ? '#93c5fd' : '#1e40af',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <User size={14} />
              {t('sectionEntity')}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '1rem',
                borderRadius: RADII.lg,
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                  {t('colEntityType')}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: RADII.sm,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                    color: isDark ? '#93c5fd' : '#1d4ed8',
                    border: isDark ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #bfdbfe',
                    marginTop: '4px',
                  }}
                >
                  {log.entityType}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                  {t('colAction')}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: RADII.sm,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff',
                    color: isDark ? '#d8b4fe' : '#6b21a8',
                    border: isDark ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid #e9d5ff',
                    marginTop: '4px',
                  }}
                >
                  {log.action}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                  {t('colEntityId')}
                </span>
                <code style={{ fontSize: '0.8rem', color: isDark ? '#cbd5e1' : '#334155', fontFamily: 'monospace', display: 'block', marginTop: '4px' }}>
                  {log.entityId}
                </code>
              </div>
            </div>
          </div>

          {/* Before vs After Diff Section */}
          <div>
            <h3
              style={{
                margin: '0 0 0.75rem 0',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 700,
                color: isDark ? '#93c5fd' : '#1e40af',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileText size={14} />
              {t('sectionDiff')}
            </h3>

            {log.fieldName && (
              <div style={{ marginBottom: '0.75rem', fontSize: TYPOGRAPHY.fontSize.sm, color: isDark ? '#e2e8f0' : '#334155' }}>
                Field: <strong style={{ color: isDark ? '#60a5fa' : '#2563eb' }}>{log.fieldName}</strong>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* Old Value Box */}
              <div
                style={{
                  border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fecaca',
                  borderRadius: RADII.lg,
                  padding: '0.75rem',
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: isDark ? '#fca5a5' : '#991b1b' }}>
                  <span>{t('stateBefore')}</span>
                </div>
                {renderJsonOrText(log.oldValue)}
              </div>

              {/* New Value Box */}
              <div
                style={{
                  border: isDark ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid #bbf7d0',
                  borderRadius: RADII.lg,
                  padding: '0.75rem',
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#f0fdf4',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: isDark ? '#86efac' : '#166534' }}>
                  <span>{t('stateAfter')}</span>
                  <ArrowRight size={14} />
                </div>
                {renderJsonOrText(log.newValue)}
              </div>
            </div>
          </div>

          {/* Reason / Note Section */}
          {log.reason && (
            <div
              style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                borderRadius: RADII.lg,
                padding: '1rem',
              }}
            >
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569' }}>
                {t('reasonTitle')}
              </h4>
              <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: isDark ? '#f8fafc' : '#1e293b' }}>{log.reason}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          }}
        >
          <Button type="button" variant="primary" onClick={onClose}>
            {t('btnClose')}
          </Button>
        </div>
      </div>
    </div>
  );
};
