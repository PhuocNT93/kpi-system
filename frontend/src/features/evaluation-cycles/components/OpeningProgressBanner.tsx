import React from 'react';
import type { CycleOpeningStatusDTO } from '../types/cycle-types';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Loader2 } from 'lucide-react';

interface OpeningProgressBannerProps {
  status?: CycleOpeningStatusDTO;
}

export const OpeningProgressBanner: React.FC<OpeningProgressBannerProps> = ({ status }) => {
  const processed = status?.processed ?? 0;
  const total = status?.total ?? 100;
  const percentage = Math.min(100, Math.round((processed / Math.max(1, total)) * 100));

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: RADII.xl,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Loader2 size={20} color="#0284c7" className="animate-spin" />
          <div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: '#0369a1' }}>
              Opening Evaluation Cycle in Progress...
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>
              Generating evaluation instances and taking historical snapshots
            </div>
          </div>
        </div>
        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0369a1' }}>
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e0f2fe',
          borderRadius: RADII.full,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: '#0284c7',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#0369a1' }}>
        <span>Processed: {processed} / {total}</span>
        <span>Successful: {status?.successful ?? 0}</span>
        <span>Failed: {status?.failed ?? 0}</span>
      </div>
    </div>
  );
};
