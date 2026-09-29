import React from 'react';
import { Clock } from 'lucide-react';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';
import { useReportPalette } from '../hooks/use-report-palette';

interface DataAsOfProps {
  timestamp?: string | null;
}

export const DataAsOf: React.FC<DataAsOfProps> = ({ timestamp }) => {
  const palette = useReportPalette();
  const { t, currentLocale } = useUiTranslation();

  if (!timestamp) return null;

  const formattedTime = new Intl.DateTimeFormat(currentLocale === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: palette.textMuted,
        backgroundColor: palette.surfaceSubtle,
        padding: '4px 8px',
        borderRadius: RADII.sm,
        border: `1px solid ${palette.border}`,
      }}
    >
      <Clock size={12} aria-hidden="true" />
      <span>{t('reports.common.data_as_of', 'Data as of {time}', { time: formattedTime })}</span>
    </span>
  );
};
