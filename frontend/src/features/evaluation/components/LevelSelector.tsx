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
  const displayLevels = [...levels].reverse();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        width: '100%',
      }}
    >
      {displayLevels.map((lvl) => {
        const levelNum = lvl.level ?? lvl.level_no ?? 0;
        const levelLabel = lvl.label_vn || lvl.label_en || lvl.name || `Level ${levelNum}`;
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
              flex: 1,
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: RADII.lg,
              border: `1.5px solid ${isSelected ? COLORS.primary.DEFAULT : COLORS.neutral[200]}`,
              backgroundColor: isSelected ? COLORS.primary[50] : disabled ? COLORS.neutral[50] : COLORS.neutral.white,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              boxShadow: isSelected ? '0 1px 4px rgba(79, 70, 229, 0.1)' : 'none',
              textAlign: 'center',
            }}
          >
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
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

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  color: isSelected ? COLORS.primary[900] : COLORS.neutral.textPrimary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Mức {levelNum}
              </div>
              <div
                style={{
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  color: COLORS.neutral.textSecondary,
                  whiteSpace: 'pre-line',
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'clip',
                  lineHeight: 1.35,
                }}
              >
                {levelLabel}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
