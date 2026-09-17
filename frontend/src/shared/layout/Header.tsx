import React, { useState } from 'react';
import { TYPOGRAPHY, RADII } from '@/shared/theme';
import { useTheme } from '@/shared/theme';
import { Sun, Moon } from 'lucide-react';
import { NotificationBell } from '@/features/notifications';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showThemeToggle?: boolean;
  showNotificationBell?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Configure Evaluation',
  subtitle,
  actions,
  showThemeToggle = true,
  showNotificationBell = true,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [toggleHovered, setToggleHovered] = useState(false);

  return (
    <header
      style={{
        height: '72px',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${isDark ? '#1F2937' : '#E2E8F0'}`,
        boxShadow: isDark ? '0 1px 3px 0 rgba(0, 0, 0, 0.4)' : '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        zIndex: 5,
        flexShrink: 0,
      }}
    >
      {/* Title & Subtitle Section */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: TYPOGRAPHY.fontFamily.headline,
            fontSize: TYPOGRAPHY.fontSize.xl,
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: isDark ? '#F9FAFB' : '#0F172A',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            transition: 'color 0.2s ease',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: '3px 0 0 0',
              fontFamily: TYPOGRAPHY.fontFamily.body,
              fontSize: TYPOGRAPHY.fontSize.xs,
              color: isDark ? '#9CA3AF' : '#64748B',
              transition: 'color 0.2s ease',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right-hand Controls: Dark Mode Switch, Notification Bell & Page Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {showNotificationBell && <NotificationBell />}
        {showThemeToggle && (
          <button
            type="button"
            onClick={toggleTheme}
            onMouseEnter={() => setToggleHovered(true)}
            onMouseLeave={() => setToggleHovered(false)}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: RADII.lg,
              border: `1px solid ${
                toggleHovered
                  ? isDark
                    ? '#4B5563'
                    : '#CBD5E1'
                  : isDark
                  ? '#374151'
                  : '#E2E8F0'
              }`,
              backgroundColor: isDark
                ? toggleHovered
                  ? '#374151'
                  : '#1F2937'
                : toggleHovered
                ? '#F1F5F9'
                : '#FFFFFF',
              color: isDark ? '#FBBF24' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.18s ease-in-out',
              boxShadow: toggleHovered
                ? '0 2px 4px rgba(0, 0, 0, 0.08)'
                : 'none',
            }}
          >
            {isDark ? (
              <Sun size={18} style={{ transition: 'transform 0.2s ease' }} />
            ) : (
              <Moon size={18} style={{ transition: 'transform 0.2s ease' }} />
            )}
          </button>
        )}

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};
