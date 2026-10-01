import type React from 'react';
import { Search } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';

export type EvaluationPickerItem = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
};

type EvaluationPickerListProps = {
  items: EvaluationPickerItem[];
  activeId: string | null | undefined;
  searchValue: string;
  searchPlaceholder: string;
  emptyLabel: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
};

export function EvaluationPickerList({
  items,
  activeId,
  searchValue,
  searchPlaceholder,
  emptyLabel,
  onSearchChange,
  onSelect,
}: EvaluationPickerListProps) {
  return (
    <aside className="my-eval-picker" style={containerStyle}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Search size={16} color={COLORS.neutral[400]} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          style={searchInputStyle}
        />
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div data-testid="evaluation-picker-scroll" className="no-scrollbar" style={scrollAreaStyle}>
          {items.length === 0 ? (
            <div style={emptyStateStyle}>{emptyLabel}</div>
          ) : (
            items.map((item) => {
              const isSelected = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(item.id)}
                  style={{
                    ...cardStyle,
                    border: `1px solid ${isSelected ? COLORS.primary.DEFAULT : COLORS.neutral[200]}`,
                    background: isSelected ? 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.14))' : COLORS.neutral.white,
                    boxShadow: isSelected ? '0 8px 20px rgba(99,102,241,0.14)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: TYPOGRAPHY.fontWeight.bold, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textPrimary }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '4px', lineHeight: 1.45 }}>
                    {item.subtitle}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <span
                      style={{
                        ...statusBadgeStyle,
                        color: isSelected ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
                        borderColor: isSelected ? COLORS.primary[100] : COLORS.neutral[200],
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {/* Fade hints that more cards are available below, since the scrollbar is hidden. */}
        <div aria-hidden="true" style={fadeStyle} />
      </div>
    </aside>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '14px',
  background: COLORS.neutral.white,
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII['2xl'],
  boxShadow: SHADOWS.card,
  boxSizing: 'border-box',
  minWidth: 0,
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px 10px 36px',
  borderRadius: RADII.xl,
  border: `1px solid ${COLORS.neutral[200]}`,
  background: COLORS.neutral.white,
  fontSize: TYPOGRAPHY.fontSize.sm,
  outline: 'none',
  boxSizing: 'border-box',
};

const scrollAreaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  overflowY: 'auto',
  flex: 1,
  minHeight: 0,
  paddingBottom: '16px',
};

const cardStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 14px',
  borderRadius: RADII.xl,
  cursor: 'pointer',
  textAlign: 'left',
  flexShrink: 0,
  transition: 'border-color 0.15s ease, background 0.15s ease',
};

const statusBadgeStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: RADII.md,
  border: '1px solid',
  fontSize: TYPOGRAPHY.fontSize.xs,
  fontWeight: TYPOGRAPHY.fontWeight.bold,
  letterSpacing: '0.04em',
  background: COLORS.neutral.white,
};

const emptyStateStyle: React.CSSProperties = {
  padding: '14px',
  borderRadius: RADII.xl,
  border: `1px dashed ${COLORS.neutral[200]}`,
  color: COLORS.neutral.textSecondary,
  fontSize: TYPOGRAPHY.fontSize.sm,
};

const fadeStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: '20px',
  pointerEvents: 'none',
  background: `linear-gradient(180deg, rgba(255,255,255,0), ${COLORS.neutral.white})`,
};
