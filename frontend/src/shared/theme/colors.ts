/**
 * Lumina HR Design System Color Tokens
 * All components must use COLORS token definitions instead of hardcoded hex values.
 */

export const COLORS = {
  primary: {
    DEFAULT: '#7C3AED',
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
    dark: '#3B0764',
    light: '#EDE9FE',
    foreground: '#FFFFFF'
  },
  secondary: {
    DEFAULT: '#2563EB',
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    foreground: '#FFFFFF'
  },
  tertiary: {
    DEFAULT: '#0F172A',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
    foreground: '#FFFFFF'
  },
  neutral: {
    DEFAULT: '#F8F9FC',
    white: '#FFFFFF',
    50: '#F8F9FC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    border: '#E2E8F0',
    inputBorder: '#E2E8F0',
    surface: '#FFFFFF',
    surfaceSubtle: '#F8F9FC',
    surfaceMuted: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8'
  },
  semantic: {
    danger: {
      DEFAULT: '#DC2626',
      50: '#FEF2F2',
      100: '#FEE2E2',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      foreground: '#FFFFFF'
    },
    success: {
      DEFAULT: '#16A34A',
      50: '#F0FDF4',
      100: '#DCFCE7',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      foreground: '#FFFFFF'
    },
    warning: {
      DEFAULT: '#D97706',
      50: '#FFFBEB',
      100: '#FEF3C7',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      foreground: '#FFFFFF'
    },
    info: {
      DEFAULT: '#2563EB',
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      foreground: '#FFFFFF'
    }
  },
  // Special chips & status
  status: {
    manual: '#F59E0B',
    auto: '#10B981',
    draft: '#64748B',
    active: '#7C3AED',
    completed: '#16A34A',
    locked: '#0F172A',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  }
} as const;

export type ColorTokens = typeof COLORS;
