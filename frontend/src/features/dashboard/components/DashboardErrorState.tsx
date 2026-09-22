import React from 'react';
import { AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';

export interface DashboardErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
}

export const DashboardErrorState: React.FC<DashboardErrorStateProps> = ({ error, onRetry }) => {
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  const isForbidden = error?.message?.includes('403') || error?.message?.toLowerCase().includes('forbidden') || error?.message?.toLowerCase().includes('permission');

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        borderRadius: RADII['2xl'],
        backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
        border: `1.5px dashed ${isForbidden ? '#F87171' : isDark ? '#4B5563' : COLORS.neutral[300]}`,
        boxShadow: SHADOWS.sm,
        textAlign: 'center',
        margin: '32px 0',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: RADII.full,
          backgroundColor: isForbidden ? '#FEF2F2' : isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {isForbidden ? <ShieldAlert size={28} color="#EF4444" /> : <AlertCircle size={28} color="#EF4444" />}
      </div>

      <h3
        style={{
          margin: '0 0 8px 0',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
          fontFamily: TYPOGRAPHY.fontFamily.headline,
        }}
      >
        {isForbidden ? t('error_403_title', 'Access Restricted') : t('error_dashboard_title', 'Failed to Load Dashboard')}
      </h3>

      <p
        style={{
          margin: '0 0 24px 0',
          fontSize: '0.875rem',
          color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
          maxWidth: '440px',
          lineHeight: 1.5,
        }}
      >
        {isForbidden
          ? t('error_403_desc', 'You do not have sufficient permissions to view statistics for this scope. Your access is restricted by server-side role boundaries.')
          : error?.message || t('error_dashboard_title', 'An unexpected error occurred while loading dashboard statistics. Please try again.')}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: RADII.lg,
            border: 'none',
            backgroundColor: COLORS.primary.DEFAULT,
            color: COLORS.neutral.white,
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
          }}
        >
          <RefreshCw size={16} />
          <span>{t('retry', 'Try Again')}</span>
        </button>
      )}
    </div>
  );
};
