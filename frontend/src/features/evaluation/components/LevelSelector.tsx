import React from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { CheckCircle2 } from 'lucide-react';

export interface LevelItem {
  level?: number;
  level_no?: number;
  name?: string;
  label_en?: string;
  label_vn?: string;
  score?: number;
  score_value?: number;
  description?: string;
}

interface LevelSelectorProps {
  levels: LevelItem[];
  selectedLevel?: number | null;
  onSelectLevel: (level: number) => void;
  disabled?: boolean;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  levels,
  selectedLevel,
  onSelectLevel,
  disabled = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {levels.map((lvl) => {
        const levelNum = lvl.level ?? lvl.level_no ?? 0;
        const levelLabel = lvl.label_vn || lvl.label_en || lvl.name || `Level ${levelNum}`;
        const scoreVal = lvl.score ?? lvl.score_value;
        const isSelected = selectedLevel === levelNum;

        return (
          <div
            key={levelNum}
            onClick={() => {
              if (!disabled) {
                onSelectLevel(levelNum);
              }
            }}
            style={{
              padding: '12px 16px',
              borderRadius: RADII.lg,
              border: `1.5px solid ${isSelected ? COLORS.primary.DEFAULT : COLORS.neutral[200]}`,
              backgroundColor: isSelected ? COLORS.primary[50] : disabled ? COLORS.neutral[50] : COLORS.neutral.white,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              transition: 'all 0.15s ease',
              boxShadow: isSelected ? '0 1px 4px rgba(79, 70, 229, 0.1)' : 'none',
            }}
          >
            <div style={{ marginTop: '2px', flexShrink: 0 }}>
              {isSelected ? (
                <CheckCircle2 size={18} color={COLORS.primary.DEFAULT} />
              ) : (
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: `2px solid ${disabled ? COLORS.neutral[300] : COLORS.neutral[400]}`,
                    backgroundColor: COLORS.neutral.white,
                  }}
                />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontWeight: isSelected ? 600 : 500,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    color: isSelected ? COLORS.primary[900] : COLORS.neutral.textPrimary,
                  }}
                >
                  Mức {levelNum}: {levelLabel}
                </span>
                {scoreVal !== undefined && (
                  <span
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 600,
                      color: isSelected ? COLORS.primary[700] : COLORS.neutral.textSecondary,
                      backgroundColor: isSelected ? COLORS.primary[100] : COLORS.neutral[100],
                      padding: '2px 8px',
                      borderRadius: RADII.md,
                    }}
                  >
                    Điểm: {scoreVal}
                  </span>
                )}
              </div>

              {lvl.description && (
                <div
                  style={{
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    color: COLORS.neutral.textSecondary,
                    marginTop: '4px',
                    lineHeight: 1.4,
                  }}
                >
                  {lvl.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
