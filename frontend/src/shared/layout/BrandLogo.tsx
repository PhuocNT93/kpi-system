import React from 'react';
import { TYPOGRAPHY, useTheme } from '@/shared/theme';
import emblemUrl from '@/assets/brand/performant-emblem.png';

export interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
}

// Brand colours taken from the Performant emblem (navy anchor, teal growth arrow).
const BRAND_NAVY = '#1e3a5f';
const BRAND_TEAL = '#0e7c86';

// The emblem sits on a white tile so its light background also reads well in dark mode.
export const BrandIcon: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <span
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      overflow: 'hidden',
    }}
  >
    <img src={emblemUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  </span>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({ collapsed = false, className }) => {
  const { isDark } = useTheme();

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? '0' : '10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      title="Performant - Member KPI • Marine Logistics"
      aria-label="Performant - Member KPI • Marine Logistics"
    >
      <BrandIcon size={40} />

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span
            style={{
              fontFamily: TYPOGRAPHY.fontFamily.headline,
              fontSize: '1.05rem',
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              letterSpacing: '0.04em',
              color: isDark ? '#F8FAFC' : BRAND_NAVY,
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
            }}
          >
            PERFORMANT
          </span>
          <span
            style={{
              fontFamily: TYPOGRAPHY.fontFamily.body,
              fontSize: '0.6rem',
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              letterSpacing: '0.04em',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              marginTop: '2px',
              color: isDark ? '#CBD5E1' : BRAND_NAVY,
            }}
          >
            MEMBER KPI{' '}
            <span style={{ color: isDark ? '#5EEAD4' : BRAND_TEAL }}>• MARINE LOGISTICS</span>
          </span>
        </div>
      )}
    </div>
  );
};
