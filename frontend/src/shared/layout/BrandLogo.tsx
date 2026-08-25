import React from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

export interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
}

export const BrandIcon: React.FC<{ size?: number }> = ({ size = 34 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, borderRadius: RADII.md }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brand-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={COLORS.primary.DEFAULT} />
          <stop offset="100%" stopColor={COLORS.secondary.DEFAULT} />
        </linearGradient>
      </defs>

      {/* Background container */}
      <rect width="36" height="36" rx="8" fill="url(#brand-grad)" />

      {/* Stylized letter 'P' with growth chart & performance arrow */}
      {/* Stem of P */}
      <rect x="8" y="8" width="4.5" height="20" rx="2" fill={COLORS.neutral.white} />

      {/* Loop of P */}
      <path
        d="M12.5 8H20C23.3137 8 26 10.6863 26 14C26 17.3137 23.3137 20 20 20H12.5V8Z"
        fill={COLORS.neutral.white}
        fillOpacity="0.9"
      />

      {/* Inner cutout of P */}
      <path
        d="M12.5 12H19.5C20.6046 12 21.5 12.8954 21.5 14C21.5 15.1046 20.6046 16 19.5 16H12.5V12Z"
        fill="url(#brand-grad)"
      />

      {/* Growth Trend Accent: Bar chart & arrow inside */}
      <rect x="14.5" y="14" width="1.8" height="2" rx="0.5" fill={COLORS.neutral.white} />
      <rect x="17" y="13" width="1.8" height="3" rx="0.5" fill={COLORS.neutral.white} />
      <path
        d="M15 13.5L18.5 10M18.5 10H16.5M18.5 10V12"
        stroke={COLORS.neutral.white}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ collapsed = false, className }) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? '0' : '10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        userSelect: 'none',
        overflow: 'hidden'
      }}
      title="Performant - Employee KPI Evaluation"
      aria-label="Performant - Employee KPI Evaluation"
    >
      <BrandIcon size={34} />

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span
            style={{
              fontFamily: TYPOGRAPHY.fontFamily.headline,
              fontSize: '1.05rem',
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              letterSpacing: '0.04em',
              color: COLORS.neutral.textPrimary,
              lineHeight: 1.15,
              whiteSpace: 'nowrap'
            }}
          >
            PERFORMANT
          </span>
          <span
            style={{
              fontFamily: TYPOGRAPHY.fontFamily.body,
              fontSize: '0.65rem',
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              letterSpacing: '0.08em',
              color: COLORS.neutral.textSecondary,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              marginTop: '2px'
            }}
          >
            KPI EVALUATION
          </span>
        </div>
      )}
    </div>
  );
};
