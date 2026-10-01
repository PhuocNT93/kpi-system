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
  /** Tighter spacing, groups on one row, and fills the height of its grid cell. */
  compact?: boolean;
  /** Compact only: assessment note shown under the total score in a fixed-height box. */
  note?: string;
  onGroupClick?: (groupKey: string) => void;
};

export function EvaluationScoreSummaryPanel({ score, grouped, formulaText, formulaSource, compact = false, note, onGroupClick }: EvaluationScoreSummaryPanelProps) {
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

  if (compact) {
    return (
      <div style={{ ...scoreCardStyle, height: '100%', boxSizing: 'border-box', padding: '14px 16px', gap: '12px', boxShadow: SHADOWS.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px 12px', flexWrap: 'wrap' }}>
          <div style={eyebrowStyle}>Điểm tổng</div>
          <div style={{ ...formulaTextStyle, fontSize: TYPOGRAPHY.fontSize.xs }}>{dynamicFormulaText}</div>
          {formulaSource && <div style={formulaSourceStyle}>📊 Công thức: {formulaSource}</div>}
        </div>

        <div style={{ fontSize: 'clamp(2.2rem, 3.4vw, 3rem)', lineHeight: 1, fontWeight: TYPOGRAPHY.fontWeight.extrabold, color: COLORS.primary.DEFAULT }}>
          {score.toFixed(2)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', alignItems: 'start' }}>
          {grouped.map((group) => (
            <div key={group.key} style={{ ...groupCardStyle, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{group.key}</div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: group.accent, fontWeight: TYPOGRAPHY.fontWeight.semibold, whiteSpace: 'nowrap' }}>{group.criteriaCount} criteria</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.extrabold, color: group.accent }}>
                  {group.average != null ? group.average.toFixed(2) : '0.0'}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, whiteSpace: 'nowrap' }}>Trọng số {group.weight}%</div>
              </div>
            </div>
          ))}
        </div>

        {/* The note absorbs any spare height; score and group cards keep their natural size. */}
        {note && (
          <div style={noteBoxStyle}>
            <div style={{ ...eyebrowStyle, fontSize: '0.6875rem', marginBottom: '6px' }}>Nhận xét</div>
            <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {note}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ ...panelStyle, padding: '22px' }}>
        <div style={{ ...scoreCardStyle, padding: '22px', gap: '18px' }}>
          <div>
            <div style={eyebrowStyle}>Điểm tổng</div>
            <div style={{ marginTop: '10px', fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 1, fontWeight: TYPOGRAPHY.fontWeight.extrabold, color: COLORS.primary.DEFAULT }}>
              {score.toFixed(2)}
            </div>
            <div style={{ ...formulaTextStyle, marginTop: '8px' }}>
              {dynamicFormulaText}
            </div>
            {formulaSource && (
              <div style={{ ...formulaSourceStyle, marginTop: '10px' }}>
                📊 Công thức: {formulaSource}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {grouped.map((group) => (
              <div
                key={group.key}
                role={onGroupClick ? 'button' : undefined}
                tabIndex={onGroupClick ? 0 : undefined}
                onClick={onGroupClick ? () => onGroupClick(group.key) : undefined}
                onKeyDown={
                  onGroupClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onGroupClick(group.key);
                        }
                      }
                    : undefined
                }
                style={{
                  background: COLORS.neutral.white,
                  borderRadius: RADII.xl,
                  padding: '14px',
                  border: `1px solid ${COLORS.neutral[200]}`,
                  cursor: onGroupClick ? 'pointer' : 'default',
                }}
              >
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

const scoreCardStyle: React.CSSProperties = {
  borderRadius: RADII['2xl'],
  background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(124,58,237,0.14))',
  border: `1px solid ${COLORS.primary[100]}`,
  display: 'flex',
  flexDirection: 'column',
};

const groupCardStyle: React.CSSProperties = {
  background: COLORS.neutral.white,
  borderRadius: RADII.xl,
  border: `1px solid ${COLORS.neutral[200]}`,
};

const noteBoxStyle: React.CSSProperties = {
  flex: 1,
  minHeight: '96px',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  padding: '10px 14px',
  borderRadius: RADII.xl,
  background: 'rgba(255,255,255,0.7)',
  border: `1px solid ${COLORS.neutral[200]}`,
  fontSize: TYPOGRAPHY.fontSize.sm,
  lineHeight: 1.45,
  color: COLORS.neutral.textSecondary,
};

const formulaTextStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.sm,
  color: COLORS.neutral.textSecondary,
  fontFamily: 'monospace',
};

const formulaSourceStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '3px 10px',
  borderRadius: '999px',
  fontSize: TYPOGRAPHY.fontSize.xs,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
  backgroundColor: 'rgba(99,102,241,0.10)',
  border: '1px solid rgba(99,102,241,0.25)',
  color: COLORS.primary.DEFAULT,
};

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
