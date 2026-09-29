import { useTheme } from '@/shared/theme';

export type ReportTone = 'primary' | 'success' | 'warning' | 'info' | 'neutral';

export interface ReportToneColors {
  fg: string;
  bg: string;
}

export interface ReportPalette {
  surface: string;
  surfaceSubtle: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputBg: string;
  inputBorder: string;
  shadow: string;
  tones: Record<ReportTone, ReportToneColors>;
}

const LIGHT: ReportPalette = {
  surface: '#ffffff',
  surfaceSubtle: '#f8fafc',
  surfaceMuted: '#f1f5f9',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  shadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
  tones: {
    primary: { fg: '#7c3aed', bg: '#f5f3ff' },
    success: { fg: '#059669', bg: '#ecfdf5' },
    warning: { fg: '#d97706', bg: '#fffbeb' },
    info: { fg: '#2563eb', bg: '#eff6ff' },
    neutral: { fg: '#64748b', bg: '#f1f5f9' },
  },
};

const DARK: ReportPalette = {
  surface: '#1e293b',
  surfaceSubtle: '#0f172a',
  surfaceMuted: '#1a2436',
  border: '#334155',
  borderStrong: '#475569',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  inputBg: '#0f172a',
  inputBorder: '#334155',
  shadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  tones: {
    primary: { fg: '#c4b5fd', bg: 'rgba(124, 58, 237, 0.2)' },
    success: { fg: '#6ee7b7', bg: 'rgba(5, 150, 105, 0.2)' },
    warning: { fg: '#fcd34d', bg: 'rgba(217, 119, 6, 0.2)' },
    info: { fg: '#93c5fd', bg: 'rgba(37, 99, 235, 0.2)' },
    neutral: { fg: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
  },
};

export function getReportPalette(isDark: boolean): ReportPalette {
  return isDark ? DARK : LIGHT;
}

export function useReportPalette(): ReportPalette {
  const { isDark } = useTheme();
  return getReportPalette(isDark);
}
