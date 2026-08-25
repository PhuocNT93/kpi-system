import React from 'react';
import { COLORS } from '@/lib/theme';
import { RADII } from '@/shared/theme';

export interface NavDockItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

export interface NavDockProps {
  items?: NavDockItem[];
  activeId?: string;
  onChange?: (id: string) => void;
  style?: React.CSSProperties;
}

const DEFAULT_ITEMS: NavDockItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  },
  {
    id: 'search',
    label: 'Search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    )
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }
];

export const NavDock: React.FC<NavDockProps> = ({
  items = DEFAULT_ITEMS,
  activeId = 'home',
  onChange,
  style
}) => {
  return (
    <nav
      aria-label="Dock Navigation"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: COLORS.neutral[100],
        padding: '6px',
        borderRadius: RADII.full,
        gap: '8px',
        border: `1px solid ${COLORS.neutral.border}`,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        ...style
      }}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onChange?.(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: RADII.full,
              border: 'none',
              backgroundColor: isActive ? COLORS.primary.DEFAULT : 'transparent',
              color: isActive ? COLORS.primary.foreground : COLORS.neutral.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              outline: 'none'
            }}
          >
            {item.icon}
          </button>
        );
      })}
    </nav>
  );
};
