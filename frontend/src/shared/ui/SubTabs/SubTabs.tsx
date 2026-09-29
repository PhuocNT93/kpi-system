import React from 'react';
import { TYPOGRAPHY, useTheme } from '@/shared/theme';

export interface SubTabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

// Each tab level has its own shape so nested tabs never look alike:
// hub tabs (level 1) are underlined, level 2 is a segmented control, level 3 is a row of pills.
export type SubTabLevel = 2 | 3;

interface SubTabsProps<T extends string> {
  items: SubTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  // Buttons for the active sub-tab (e.g. "+ Create"), aligned right on the same row.
  actions?: React.ReactNode;
  level?: SubTabLevel;
}

export function SubTabs<T extends string>({ items, value, onChange, ariaLabel, actions, level = 2 }: SubTabsProps<T>) {
  const { isDark } = useTheme();
  const accent = isDark ? '#a5b4fc' : '#4f46e5';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const isSegmented = level === 2;

  const tablistStyle: React.CSSProperties = isSegmented
    ? {
        display: 'inline-flex',
        gap: '2px',
        padding: '4px',
        borderRadius: '10px',
        backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
        border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      }
    : { display: 'flex', gap: '8px' };

  const tabStyle = (isActive: boolean): React.CSSProperties =>
    isSegmented
      ? {
          padding: '7px 16px',
          minHeight: '34px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: isActive ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
          boxShadow: isActive ? (isDark ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(15,23,42,0.08)') : 'none',
          color: isActive ? (isDark ? '#f8fafc' : '#0f172a') : mutedText,
          fontSize: TYPOGRAPHY.fontSize.sm,
          fontWeight: isActive ? 600 : 500,
        }
      : {
          padding: '5px 14px',
          minHeight: '30px',
          borderRadius: '999px',
          border: `1px solid ${
            isActive ? (isDark ? '#6366f1' : '#c7d2fe') : isDark ? '#334155' : '#e2e8f0'
          }`,
          backgroundColor: isActive ? (isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff') : 'transparent',
          color: isActive ? accent : mutedText,
          fontSize: '0.8125rem',
          fontWeight: isActive ? 600 : 500,
        };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        // Never shrink inside a height-filling flex column.
        flexShrink: 0,
        marginBottom: isSegmented ? '1.25rem' : '1rem',
      }}
    >
      <div style={{ minWidth: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        <div role="tablist" aria-label={ariaLabel} style={tablistStyle}>
          {items.map((item) => {
            const isActive = item.id === value;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(item.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 150ms ease, color 150ms ease, border-color 150ms ease',
                  ...tabStyle(isActive),
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>{actions}</div>
      )}
    </div>
  );
}
