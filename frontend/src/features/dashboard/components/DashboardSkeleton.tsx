import React from 'react';
import { RADII, useTheme } from '@/shared/theme';

export const DashboardSkeleton: React.FC = () => {
  const { isDark } = useTheme();

  const skeletonColor = isDark ? '#374151' : '#E5E7EB';
  const pulseStyle: React.CSSProperties = {
    backgroundColor: skeletonColor,
    borderRadius: RADII.lg,
    animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ width: '140px', height: '24px', ...pulseStyle }} />
          <div style={{ width: '280px', height: '32px', ...pulseStyle }} />
        </div>
        <div style={{ width: '100px', height: '36px', ...pulseStyle }} />
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: '120px', ...pulseStyle, borderRadius: RADII.xl }} />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        <div style={{ height: '260px', ...pulseStyle, borderRadius: RADII.xl }} />
        <div style={{ height: '260px', ...pulseStyle, borderRadius: RADII.xl }} />
      </div>
    </div>
  );
};
