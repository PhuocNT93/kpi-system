import React from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS, useTheme } from '@/shared/theme';

export interface SummaryCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  variant = 'default',
  onClick,
}) => {
  const { isDark } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #A7F3D0',
          bgIcon: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
          colorIcon: '#10B981',
        };
      case 'warning':
        return {
          border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #FDE68A',
          bgIcon: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
          colorIcon: '#F59E0B',
        };
      case 'danger':
        return {
          border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #FECACA',
          bgIcon: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          colorIcon: '#EF4444',
        };
      case 'info':
        return {
          border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #BFDBFE',
          bgIcon: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
          colorIcon: '#3B82F6',
        };
      default:
        return {
          border: isDark ? '1px solid #374151' : `1px solid ${COLORS.neutral[200]}`,
          bgIcon: isDark ? 'rgba(255, 255, 255, 0.05)' : COLORS.primary[50],
          colorIcon: COLORS.primary.DEFAULT,
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <div
      role="region"
      aria-label={title}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(14px, 2.5vw, 20px)',
        borderRadius: RADII.xl,
        backgroundColor: isDark ? '#1F2937' : COLORS.neutral.white,
        border: vStyles.border,
        boxShadow: SHADOWS.sm,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        minHeight: '120px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span
          style={{
            fontSize: 'clamp(0.8125rem, 2.5vw, 0.875rem)',
            fontWeight: 500,
            color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
            fontFamily: TYPOGRAPHY.fontFamily.body,
          }}
        >
          {title}
        </span>
        {icon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              flexShrink: 0,
              borderRadius: RADII.lg,
              backgroundColor: vStyles.bgIcon,
              color: vStyles.colorIcon,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            style={{
              fontSize: 'clamp(1.35rem, 3.5vw, 1.75rem)',
              fontWeight: 700,
              color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
              fontFamily: TYPOGRAPHY.fontFamily.headline,
            }}
          >
            {value != null ? value : 'N/A'}
          </span>
          {unit && (
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
              }}
            >
              {unit}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: 'clamp(0.7rem, 2vw, 0.75rem)',
              color: isDark ? '#9CA3AF' : COLORS.neutral.textSecondary,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
