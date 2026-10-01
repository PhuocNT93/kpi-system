import React from 'react';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { TrendingUp } from 'lucide-react';
import { useReportPalette, type ReportTone } from '../hooks/use-report-palette';

interface ScoreCardProps {
  title: string;
  score: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  theme?: Exclude<ReportTone, 'neutral'>;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  title,
  score,
  subtitle,
  icon = <TrendingUp size={24} />,
  theme = 'primary',
}) => {
  const palette = useReportPalette();
  const tone = palette.tones[theme];

  return (
    <div
      style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: RADII.lg,
        boxShadow: palette.shadow,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          backgroundColor: tone.bg,
          color: tone.fg,
          padding: '14px',
          borderRadius: RADII.lg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <h3
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.fontSize.sm,
            color: palette.textMuted,
            fontWeight: TYPOGRAPHY.fontWeight.medium,
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontSize: TYPOGRAPHY.fontSize['3xl'],
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: palette.textPrimary,
            marginTop: '4px',
            lineHeight: 1.2,
          }}
        >
          {score}
        </div>
        {subtitle && (
          <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: palette.textMuted, marginTop: '4px' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
