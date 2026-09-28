import type React from 'react';
import { useMemo } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';

export type ScoreGroup = {
  key: string;
  accent: string;
  criteriaCount: number;
  average: number | null;
  weight: number;
};

export type EvaluationScoreSummaryPanelProps = {
  score: number;
  grouped: ScoreGroup[];
  formulaText?: string;
  formulaSource?: string; // e.g. 'Team ALLEGRO NX' | 'Phòng ban Engineering' | 'Mặc định công ty'
};

export function EvaluationScoreSummaryPanel({ score, grouped, formulaText, formulaSource }: EvaluationScoreSummaryPanelProps) {
  const dynamicFormulaText = useMemo(() => {
    if (formulaText) return formulaText;
    if (!grouped || grouped.length === 0) {
      return '(Performance × 0.4) + (Capability × 0.3) + (Contribution × 0.3)';
    }
    return grouped
      .map((g) => {
        const ratio = g.weight / 100;
        const ratioStr = ratio % 1 === 0 ? ratio.toString() : ratio.toFixed(2).replace(/0$/, '');
        return `(${g.key} × ${ratioStr})`;
      })
      .join(' + ');
  }, [grouped, formulaText]);

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ ...panelStyle, padding: '22px' }}>
        <div style={{ borderRadius: RADII['2xl'], padding: '22px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(124,58,237,0.14))', border: `1px solid ${COLORS.primary[100]}`, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <div style={eyebrowStyle}>Điểm tổng</div>
            <div style={{ marginTop: '10px', fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 1, fontWeight: TYPOGRAPHY.fontWeight.extrabold, color: COLORS.primary.DEFAULT }}>
              {score.toFixed(2)}
            </div>
            <div style={{ marginTop: '8px', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, fontFamily: 'monospace' }}>
              {dynamicFormulaText}
            </div>
            {formulaSource && (
              <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, backgroundColor: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)', color: COLORS.primary.DEFAULT }}>
                📊 Công thức: {formulaSource}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {grouped.map((group) => (
              <div key={group.key} style={{ background: COLORS.neutral.white, borderRadius: RADII.xl, padding: '14px', border: `1px solid ${COLORS.neutral[200]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{group.key}</div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: group.accent, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{group.criteriaCount} criteria</div>
                </div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '2px' }}>Trung bình {group.key}</div>
                <div style={{ marginTop: '8px', fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.extrabold, color: group.accent }}>
                  {group.average != null ? group.average.toFixed(2) : '0.0'}
                </div>
                <div style={{ marginTop: '8px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                  Trọng số {group.weight}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: COLORS.neutral.white,
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII['2xl'],
  boxShadow: SHADOWS.card,
  padding: '22px',
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.xs,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: COLORS.primary.DEFAULT,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
};
