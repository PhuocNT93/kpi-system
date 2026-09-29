import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { useTheme } from '@/shared/theme';

interface ActiveHint {
  text: string;
  rect: DOMRect;
}

// Describes the active hub tab through an ⓘ icon instead of a separate hint row under the tab
// bar. The tooltip opens only while the pointer is on the icon and is rendered in a portal,
// because the tab bar scrolls horizontally and would clip it. Screen readers get the same text
// from the tab's aria-description.
export function useHubTabTooltip() {
  const { isDark } = useTheme();
  const [hint, setHint] = useState<ActiveHint | null>(null);

  const tabHintProps = (text: string) => ({ 'aria-description': text });

  // Rendered on every tab so selecting one never changes tab widths; only the active tab's icon
  // is visible and hoverable.
  const renderHintIcon = (text: string, isVisible = true) => (
    <span
      aria-hidden="true"
      data-testid={isVisible ? 'hub-tab-hint-icon' : undefined}
      onMouseEnter={isVisible ? (event) => setHint({ text, rect: event.currentTarget.getBoundingClientRect() }) : undefined}
      onMouseLeave={isVisible ? () => setHint(null) : undefined}
      style={{
        display: 'inline-flex',
        padding: '2px',
        opacity: 0.6,
        flexShrink: 0,
        cursor: 'help',
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      <Info size={13} />
    </span>
  );

  const tooltip =
    hint &&
    createPortal(
      <div
        role="tooltip"
        style={{
          position: 'fixed',
          top: hint.rect.bottom + 10,
          left: Math.max(8, hint.rect.left - 12),
          maxWidth: '360px',
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: isDark ? '#f8fafc' : '#0f172a',
          color: isDark ? '#0f172a' : '#f8fafc',
          fontSize: '12px',
          lineHeight: 1.5,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
          zIndex: 1100,
          pointerEvents: 'none',
        }}
      >
        {hint.text}
      </div>,
      document.body
    );

  return { tabHintProps, renderHintIcon, tooltip };
}
