import React, { useState } from 'react';
import { TYPOGRAPHY, RADII } from '@/shared/theme';
import { useTheme } from '@/shared/theme';
import { Sun, Moon, Languages, Menu, X } from 'lucide-react';
import { NotificationBell } from '@/features/notifications';
import { getUiLocale, LOCALE_STORAGE_KEY, LOCALE_CHANGE_EVENT } from '@/shared/i18n/ui-i18n';
import { patchApi } from '@/shared/api/api-client';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showThemeToggle?: boolean;
  showNotificationBell?: boolean;
  showLanguageSelector?: boolean;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Configure Evaluation',
  subtitle,
  actions,
  showThemeToggle = true,
  showNotificationBell = true,
  showLanguageSelector = true,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [toggleHovered, setToggleHovered] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<string>(() => getUiLocale());

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    setCurrentLocale(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      localStorage.setItem('preferred_locale', newLocale);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: newLocale }));
        window.dispatchEvent(new Event('storage'));
      }
      patchApi('/api/users/me/locale', { locale: newLocale }).catch(() => {});
    } catch {
      // ignore
    }
  };

  return (
    <header
      className="app-header"
      style={{
        backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${isDark ? '#1F2937' : '#E2E8F0'}`,
        boxShadow: isDark ? '0 1px 3px 0 rgba(0, 0, 0, 0.4)' : '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Title, Mobile Hamburger & Subtitle Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="hide-on-desktop"
            aria-label={isMobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: RADII.md,
              border: `1px solid ${isDark ? '#374151' : '#CBD5E1'}`,
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              color: isDark ? '#F9FAFB' : '#0F172A',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: TYPOGRAPHY.fontFamily.headline,
              fontSize: 'clamp(1.125rem, 3.2vw, 1.5rem)',
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
              className="hide-on-mobile"
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
      </div>

      {/* Right-hand Controls: Language Switcher, Dark Mode Switch, Notification Bell & Page Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {showNotificationBell && <NotificationBell />}

        {showLanguageSelector && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '38px',
              padding: '0 8px',
              borderRadius: RADII.lg,
              border: `1px solid ${isDark ? '#374151' : '#CBD5E1'}`,
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              color: isDark ? '#F9FAFB' : '#0F172A',
              transition: 'all 0.18s ease-in-out',
            }}
          >
            <Languages size={16} style={{ color: isDark ? '#9CA3AF' : '#64748B', flexShrink: 0 }} />
            <select
              value={currentLocale}
              onChange={handleLocaleChange}
              aria-label="Select Language"
              data-testid="language-switcher"
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#F9FAFB' : '#0F172A',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: TYPOGRAPHY.fontWeight.medium,
                cursor: 'pointer',
                outline: 'none',
                paddingRight: '2px',
              }}
            >
              <option value="en" style={{ background: isDark ? '#1F2937' : '#FFFFFF', color: isDark ? '#F9FAFB' : '#0F172A' }}>
                English (EN)
              </option>
              <option value="vi" style={{ background: isDark ? '#1F2937' : '#FFFFFF', color: isDark ? '#F9FAFB' : '#0F172A' }}>
                Tiếng Việt (VI)
              </option>
            </select>
          </div>
        )}

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
