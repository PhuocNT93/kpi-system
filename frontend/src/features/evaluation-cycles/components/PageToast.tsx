import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { COLORS } from '@/lib/theme';

export type PageToastType = 'success' | 'error' | 'info';

export interface PageToastMessage {
  type: PageToastType;
  message: string;
}

interface PageToastProps {
  toast: PageToastMessage | null;
}

export const PageToast: React.FC<PageToastProps> = ({ toast }) => {
  if (!toast) return null;

  const palette = {
    success: {
      background: '#ecfdf5',
      border: '#a7f3d0',
      text: '#065f46',
      icon: '#059669',
    },
    error: {
      background: '#fef2f2',
      border: '#fecaca',
      text: '#991b1b',
      icon: '#dc2626',
    },
    info: {
      background: COLORS.neutral.white,
      border: COLORS.neutral[200],
      text: COLORS.neutral.textPrimary,
      icon: COLORS.neutral.textSecondary,
    },
  }[toast.type];

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 18px',
        borderRadius: RADII.lg,
        backgroundColor: palette.background,
        color: palette.text,
        border: `1px solid ${palette.border}`,
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: 500,
        maxWidth: '360px',
      }}
    >
      <Icon size={18} color={palette.icon} />
      <span>{toast.message}</span>
    </div>
  );
};
