import React from 'react';
import { Inbox } from 'lucide-react';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { useReportPalette } from '../hooks/use-report-palette';

interface ReportEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  // Set when the state sits inside a card that already draws its own border.
  isBare?: boolean;
}

export const ReportEmptyState: React.FC<ReportEmptyStateProps> = ({
  title,
  description,
  icon = <Inbox size={26} />,
  isBare = false,
}) => {
  const palette = useReportPalette();

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '0.75rem',
        padding: isBare ? '2rem 1rem' : '3rem 1.5rem',
        ...(isBare
          ? {}
          : {
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: RADII.lg,
              boxShadow: palette.shadow,
            }),
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: palette.tones.neutral.bg,
          color: palette.tones.neutral.fg,
        }}
      >
        {icon}
      </span>
      <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: 600, color: palette.textPrimary }}>
        {title}
      </p>
      {description && (
        <p style={{ margin: 0, maxWidth: '520px', fontSize: TYPOGRAPHY.fontSize.sm, color: palette.textMuted }}>
          {description}
        </p>
      )}
    </div>
  );
};
