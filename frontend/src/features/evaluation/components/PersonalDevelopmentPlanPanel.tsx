import type React from 'react';
import { CheckCircle2, PenLine } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';

type DevelopmentBlock = {
  title: string;
  desc: string;
  accent: string;
  value: string;
};

type PersonalDevelopmentPlanPanelProps = {
  blocks: DevelopmentBlock[];
  isSaving: boolean;
  isSaved: boolean;
  canSave: boolean;
  onSave: () => void;
  onChangeBlock: (index: number, value: string) => void;
};

export function PersonalDevelopmentPlanPanel({
  blocks,
  isSaving,
  isSaved,
  canSave,
  onSave,
  onChangeBlock,
}: PersonalDevelopmentPlanPanelProps) {
  return (
    <section style={panelStyle}>
      <div style={sectionHeadingStyle}>
        <div>
          <div style={eyebrowStyle}>Personal Development Plan</div>
          <h2 style={sectionTitleStyle}>Personal Development Plan</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: COLORS.semantic.success[700], fontSize: TYPOGRAPHY.fontSize.sm }}>
            <CheckCircle2 size={16} /> {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Saving...'}
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !canSave}
            style={{
              padding: '10px 14px',
              borderRadius: RADII.full,
              border: `1px solid ${COLORS.primary[100]}`,
              background: COLORS.primary.DEFAULT,
              color: COLORS.neutral.white,
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              cursor: isSaving || !canSave ? 'not-allowed' : 'pointer',
              opacity: isSaving || !canSave ? 0.7 : 1,
            }}
          >
            Save PDP
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
        {blocks.map((block, index) => {
          const characterCount = block.value.length;
          return (
            <div key={block.title} style={{ border: `1px solid ${COLORS.neutral[200]}`, borderTop: `4px solid ${block.accent}`, borderRadius: RADII['2xl'], padding: '18px', background: COLORS.neutral.white }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: RADII.lg, display: 'grid', placeItems: 'center', background: `${block.accent}14`, color: block.accent }}><PenLine size={16} /></div>
                    <div>
                      <div style={{ fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{block.title}</div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{block.desc}</div>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{isSaved ? 'Autosaved' : 'Saving...'}</span>
              </div>
              <div style={{ marginTop: '14px', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.xl, padding: '14px', minHeight: '120px', background: COLORS.neutral[50] }}>
                <textarea
                  value={block.value}
                  maxLength={2000}
                  onChange={(event) => onChangeBlock(index, event.target.value)}
                  placeholder="Write your response here..."
                  style={{
                    width: '100%',
                    minHeight: '92px',
                    resize: 'vertical',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: COLORS.neutral.textPrimary,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    lineHeight: 1.6,
                    fontFamily: TYPOGRAPHY.fontFamily.body,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                <span>Character count</span>
                <span>{characterCount} / 2000</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  background: COLORS.neutral.white,
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII['2xl'],
  boxShadow: SHADOWS.card,
  padding: '22px',
};

const sectionHeadingStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.xs,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: COLORS.primary.DEFAULT,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: TYPOGRAPHY.fontSize['2xl'],
  fontWeight: TYPOGRAPHY.fontWeight.bold,
};
