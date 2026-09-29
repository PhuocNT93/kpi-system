import type React from 'react';
import { RADII, TYPOGRAPHY, useTheme } from '@/shared/theme';

// Filter controls share the Audit Logs filter bar look: 38px inputs/selects with a label above.
export const FILTER_CONTROL_HEIGHT = '38px';

export function useFilterControlStyle(): { controlStyle: React.CSSProperties; labelStyle: React.CSSProperties } {
  const { isDark } = useTheme();
  return {
    controlStyle: {
      width: '100%',
      height: FILTER_CONTROL_HEIGHT,
      boxSizing: 'border-box',
      padding: '0 0.75rem',
      borderRadius: RADII.md,
      border: isDark ? '1px solid #334155' : '1px solid #d1d5db',
      fontSize: TYPOGRAPHY.fontSize.sm,
      backgroundColor: isDark ? '#0f172a' : '#fff',
      color: isDark ? '#f8fafc' : '#0f172a',
      outline: 'none',
    },
    labelStyle: {
      display: 'block',
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontWeight: 600,
      color: isDark ? '#cbd5e1' : '#4b5563',
      marginBottom: '0.35rem',
    },
  };
}
