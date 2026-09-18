import type React from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

type CycleProgress = {
  percentage: number;
  label: string;
  dateLabel: string;
};

type EvaluationOverviewPanelProps = {
  score: number;
  cycleProgress: CycleProgress;
};

export function EvaluationOverviewPanel({ score, cycleProgress }: EvaluationOverviewPanelProps) {
  const scorePercentage = Math.max(0, Math.min(100, score));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.95fr', gap: '24px', alignItems: 'center', marginTop: '22px' }}>
      <div style={{ display: 'grid', gridColumn: '1 / -1', width: '100%', gridTemplateColumns: 'repeat(2, minmax(0, auto))', gap: '18px', justifyItems: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ ...ringShellStyle, background: `conic-gradient(#6366F1 0deg, #7C3AED ${scorePercentage * 3.6}deg, #E5E7EB ${scorePercentage * 3.6}deg 360deg)` }}>
            <div style={ringInnerStyle}>
              <div style={{ fontSize: 'clamp(4rem, 7vw, 4.5rem)', lineHeight: 1, fontWeight: TYPOGRAPHY.fontWeight.extrabold, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 55%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{score.toFixed(1)}%</div>
              <div style={{ marginTop: '8px', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall Evaluation</div>
            </div>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: '360px',
            borderRadius: RADII['2xl'],
            padding: '18px',
            background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(16,185,129,0.12))',
            border: '1px solid rgba(14,165,233,0.18)',
            boxShadow: '0 18px 40px rgba(14,165,233,0.10)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0F766E', fontWeight: TYPOGRAPHY.fontWeight.semibold }}>Evaluation timeline</div>
              <div style={{ marginTop: '4px', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>{cycleProgress.dateLabel}</div>
            </div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: '#0F766E' }}>{cycleProgress.label}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ ...ringShellStyle, width: '220px', height: '220px', padding: '14px', background: `conic-gradient(#0EA5E9 0deg, #10B981 ${cycleProgress.percentage * 3.6}deg, rgba(148,163,184,0.22) ${cycleProgress.percentage * 3.6}deg 360deg)`, boxShadow: '0 18px 50px rgba(14,165,233,0.16)' }}>
              <div style={{ ...ringInnerStyle, background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FDFA 100%)' }}>
                <div style={{ fontSize: 'clamp(2.7rem, 5vw, 3.8rem)', lineHeight: 1, fontWeight: TYPOGRAPHY.fontWeight.extrabold, background: 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{cycleProgress.label}</div>
                <div style={{ marginTop: '8px', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Timeline progress</div>
                <div style={{ marginTop: '8px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, maxWidth: '150px', lineHeight: 1.5 }}>
                  From start date to end date of this evaluation cycle.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ringShellStyle: React.CSSProperties = {
  width: '320px',
  height: '320px',
  borderRadius: '50%',
  padding: '20px',
  background: 'conic-gradient(#6366F1 0deg, #7C3AED 220deg, #22C55E 290deg, #E5E7EB 290deg 360deg)',
  boxShadow: '0 18px 50px rgba(99,102,241,0.16)',
};

const ringInnerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  border: `1px solid ${COLORS.neutral[100]}`,
};
