import React from 'react';
import { Inbox } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';
import { useDashboardTranslation } from '../hooks/useDashboardTranslation';

export interface DashboardEmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
}) => {
  const { isDark } = useTheme();
  const { t } = useDashboardTranslation();

  const displayTitle = title ?? t('empty_dashboard_title', 'No Evaluation Data Found');
  const displayDescription = description ?? t('empty_dashboard_desc', 'There are no active evaluation records or statistics available for the current period.');

  return (
    <div
      role="region"
      aria-label="No Data"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        borderRadius: RADII['2xl'],
        backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
        border: `1.5px dashed ${isDark ? '#4B5563' : COLORS.neutral[300]}`,
        boxShadow: SHADOWS.sm,
        textAlign: 'center',
        margin: '24px 0',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: RADII.full,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : COLORS.primary[50],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.primary.DEFAULT,
          marginBottom: '16px',
        }}
      >
        <Inbox size={26} />
      </div>

      <h3
        style={{
          margin: '0 0 8px 0',
          fontSize: '1.125rem',
          fontWeight: 700,
          color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
          fontFamily: TYPOGRAPHY.fontFamily.headline,
        }}
      >
        {displayTitle}
      </h3>

      <p
        style={{
          margin: '0 0 20px 0',
          fontSize: '0.875rem',
          color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
          maxWidth: '420px',
          lineHeight: 1.5,
        }}
      >
        {displayDescription}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '8px 16px',
            borderRadius: RADII.md,
            border: 'none',
            backgroundColor: COLORS.primary.DEFAULT,
            color: COLORS.neutral.white,
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
