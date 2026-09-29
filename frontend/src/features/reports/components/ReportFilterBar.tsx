import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { useReportPalette } from '../hooks/use-report-palette';
import { DataAsOf } from './DataAsOf';

interface ReportFilterBarProps {
  title: string;
  dataAsOf?: string | null;
  children: React.ReactNode;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({ title, dataAsOf, children }) => {
  const palette = useReportPalette();

  return (
    <section
      aria-label={title}
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: RADII.lg,
        boxShadow: palette.shadow,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: 600,
            color: palette.textPrimary,
          }}
        >
          <SlidersHorizontal size={16} />
          {title}
        </span>
        <DataAsOf timestamp={dataAsOf} />
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
        }}
      >
        {children}
      </div>
    </section>
  );
};
