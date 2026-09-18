import type { WireAuditLog } from '../api/audit-types';
import { Button } from '../../../shared/ui/Button/Button';
import { COLORS } from '../../../lib/theme';
import { RADII, TYPOGRAPHY, useTheme } from '../../../shared/theme';
import { useUiTranslation } from '../../../shared/i18n/ui-i18n';
import { Eye } from 'lucide-react';

interface AuditTableProps {
  logs: WireAuditLog[];
  onSelectLog: (log: WireAuditLog) => void;
}

export const AuditTable = ({ logs, onSelectLog }: AuditTableProps) => {
  const { isDark } = useTheme();
  const { t, currentLocale } = useUiTranslation();

  const getActionBadgeStyle = (act: string) => {
    switch (act) {
      case 'CREATE':
        return isDark
          ? { bg: 'rgba(34, 197, 94, 0.2)', text: '#86efac', border: 'rgba(34, 197, 94, 0.4)' }
          : { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'UPDATE':
        return isDark
          ? { bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.4)' }
          : { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
      case 'DELETE':
        return isDark
          ? { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.4)' }
          : { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      case 'APPROVE':
        return isDark
          ? { bg: 'rgba(16, 185, 129, 0.2)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.4)' }
          : { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' };
      case 'REJECT':
        return isDark
          ? { bg: 'rgba(244, 63, 94, 0.2)', text: '#fda4af', border: 'rgba(244, 63, 94, 0.4)' }
          : { bg: '#ffe4e6', text: '#9f1239', border: '#fecdd3' };
      case 'REQUEST_CORRECTION':
        return isDark
          ? { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.4)' }
          : { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'SUBMIT':
        return isDark
          ? { bg: 'rgba(99, 102, 241, 0.2)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.4)' }
          : { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
      case 'PUBLISH':
        return isDark
          ? { bg: 'rgba(139, 92, 246, 0.2)', text: '#c4b5fd', border: 'rgba(139, 92, 246, 0.4)' }
          : { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' };
      case 'LOCK':
        return isDark
          ? { bg: 'rgba(249, 115, 22, 0.2)', text: '#fdba74', border: 'rgba(249, 115, 22, 0.4)' }
          : { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' };
      case 'ADJUST':
      case 'CALIBRATION_ADJUST':
        return isDark
          ? { bg: 'rgba(20, 184, 166, 0.2)', text: '#5eead4', border: 'rgba(20, 184, 166, 0.4)' }
          : { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' };
      case 'CALIBRATION_FINALIZE':
        return isDark
          ? { bg: 'rgba(217, 70, 239, 0.2)', text: '#f0abfc', border: 'rgba(217, 70, 239, 0.4)' }
          : { bg: '#fae8ff', text: '#86198f', border: '#f5d0fe' };
      default:
        return isDark
          ? { bg: 'rgba(148, 163, 184, 0.2)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.4)' }
          : { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
    }
  };

  return (
    <div
      style={{
        overflowX: 'auto',
        background: isDark ? '#1e293b' : '#fff',
        borderRadius: RADII.lg,
        border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
        boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
        <thead style={{ background: isDark ? '#0f172a' : '#f8fafc', borderBottom: isDark ? '2px solid #334155' : '2px solid #e2e8f0' }}>
          <tr>
            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[700] }}>{t('colTime')}</th>
            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[700] }}>{t('colAction')}</th>
            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[700] }}>{t('colEntityType')}</th>
            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[700] }}>{t('colEntityId')}</th>
            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[700] }}>{t('colActor')}</th>
            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[700] }}>{t('colReason')}</th>
            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: isDark ? '#cbd5e1' : COLORS.neutral[700], textAlign: 'right' }}>{t('colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const badge = getActionBadgeStyle(log.action);
            return (
              <tr
                key={log.auditLogId}
                style={{
                  borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                }}
              >
                <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: isDark ? '#94a3b8' : COLORS.neutral[600], fontSize: TYPOGRAPHY.fontSize.xs }}>
                  {new Date(log.performedAt).toLocaleString(currentLocale === 'vi' ? 'vi-VN' : 'en-US')}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: RADII.full,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: isDark ? '#f8fafc' : COLORS.neutral[800] }}>
                  {log.entityType}
                </td>
                <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b', fontFamily: 'monospace' }}>
                  {log.entityId}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ fontWeight: 500, color: isDark ? '#f8fafc' : COLORS.neutral[900] }}>
                    {log.performedByName || t('systemActor')}
                  </div>
                  {log.performedBy && (
                    <div style={{ fontSize: '0.75rem', color: isDark ? '#64748b' : '#94a3b8', fontFamily: 'monospace' }}>
                      {log.performedBy}
                    </div>
                  )}
                </td>
                <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                  {log.fieldName && (
                    <div style={{ marginBottom: '2px' }}>
                      <strong style={{ color: isDark ? '#e2e8f0' : COLORS.neutral[700] }}>{log.fieldName}:</strong>{' '}
                      <span style={{ color: isDark ? '#f87171' : '#dc2626', textDecoration: 'line-through' }}>
                        {log.oldValue ?? 'null'}
                      </span>{' '}
                      &rarr;{' '}
                      <span style={{ color: isDark ? '#4ade80' : '#16a34a', fontWeight: 600 }}>
                        {log.newValue ?? 'null'}
                      </span>
                    </div>
                  )}
                  {log.reason && (
                    <div style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.8rem', marginTop: '2px' }}>
                      <em>{log.reason}</em>
                    </div>
                  )}
                  {!log.fieldName && !log.reason && (
                    <span style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.75rem' }}>Source: {log.source || 'API'}</span>
                  )}
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                  <Button
                    type="button"
                    variant="outlined"
                    size="sm"
                    onClick={() => onSelectLog(log)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Eye size={14} />
                    {t('btnDetail')}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
