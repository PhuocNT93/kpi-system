import React, { useState } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';
import { Button } from './Button/Button';
import { SearchInput } from './Input/SearchInput';
import { ProgressBar } from './ProgressBar/ProgressBar';
import { Badge } from './Badge/Badge';
import { IconButton } from './IconButton/IconButton';
import { NavDock } from './NavDock/NavDock';

export const DesignSystemShowcase: React.FC = () => {
  const [activeDockTab, setActiveDockTab] = useState('home');
  const [searchValue, setSearchValue] = useState('');

  // Primary shade swatches
  const primaryShades = [
    COLORS.primary[900],
    COLORS.primary[800],
    COLORS.primary[700],
    COLORS.primary.DEFAULT,
    COLORS.primary[500],
    COLORS.primary[400],
    COLORS.primary[300],
    COLORS.primary[200],
    COLORS.primary[100],
    COLORS.primary[50]
  ];

  // Secondary shade swatches
  const secondaryShades = [
    COLORS.secondary[900],
    COLORS.secondary[800],
    COLORS.secondary[700],
    COLORS.secondary.DEFAULT,
    COLORS.secondary[500],
    COLORS.secondary[400],
    COLORS.secondary[300],
    COLORS.secondary[200],
    COLORS.secondary[100],
    COLORS.secondary[50]
  ];

  // Tertiary shade swatches
  const tertiaryShades = [
    COLORS.tertiary[950],
    COLORS.tertiary[900],
    COLORS.tertiary[800],
    COLORS.tertiary[700],
    COLORS.tertiary[600],
    COLORS.tertiary[500],
    COLORS.tertiary[400],
    COLORS.tertiary[300],
    COLORS.tertiary[200],
    COLORS.tertiary[100]
  ];

  // Neutral shade swatches
  const neutralShades = [
    COLORS.neutral[900],
    COLORS.neutral[800],
    COLORS.neutral[700],
    COLORS.neutral[600],
    COLORS.neutral[500],
    COLORS.neutral[400],
    COLORS.neutral[300],
    COLORS.neutral[200],
    COLORS.neutral[100],
    COLORS.neutral[50]
  ];

  const cardStyle: React.CSSProperties = {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADII.xl,
    padding: '20px',
    boxShadow: SHADOWS.card,
    border: `1px solid ${COLORS.neutral.border}`
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.neutral.surfaceSubtle,
        padding: '32px 24px',
        fontFamily: TYPOGRAPHY.fontFamily.body,
        color: COLORS.neutral.textPrimary
      }}
    >
      {/* Container matching image aspect & layout */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          backgroundColor: COLORS.neutral[100],
          borderRadius: RADII['2xl'],
          padding: '28px',
          border: `1px solid ${COLORS.neutral.border}`,
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)'
        }}
      >
        {/* Header with Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <span style={{ fontSize: '18px' }}>🎨</span>
          <h2
            style={{
              fontFamily: TYPOGRAPHY.fontFamily.headline,
              fontSize: TYPOGRAPHY.fontSize.lg,
              fontWeight: TYPOGRAPHY.fontWeight.semibold,
              color: COLORS.neutral.textSecondary,
              margin: 0
            }}
          >
            Lumina HR
          </h2>
        </div>

        {/* Main Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px'
          }}
        >
          {/* Column 1: Color Palettes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Primary Swatch Card */}
            <div
              style={{
                borderRadius: RADII.xl,
                overflow: 'hidden',
                boxShadow: SHADOWS.card
              }}
            >
              <div
                style={{
                  backgroundColor: COLORS.primary.DEFAULT,
                  color: COLORS.primary.foreground,
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: TYPOGRAPHY.fontWeight.bold,
                  fontSize: TYPOGRAPHY.fontSize.base
                }}
              >
                <span>Primary</span>
                <span style={{ opacity: 0.9 }}>{COLORS.primary.DEFAULT}</span>
              </div>
              <div style={{ display: 'flex', height: '28px' }}>
                {primaryShades.map((shade, idx) => (
                  <div key={idx} style={{ flex: 1, backgroundColor: shade }} title={shade} />
                ))}
              </div>
            </div>

            {/* Secondary Swatch Card */}
            <div
              style={{
                borderRadius: RADII.xl,
                overflow: 'hidden',
                boxShadow: SHADOWS.card
              }}
            >
              <div
                style={{
                  backgroundColor: COLORS.secondary.DEFAULT,
                  color: COLORS.secondary.foreground,
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: TYPOGRAPHY.fontWeight.bold,
                  fontSize: TYPOGRAPHY.fontSize.base
                }}
              >
                <span>Secondary</span>
                <span style={{ opacity: 0.9 }}>{COLORS.secondary.DEFAULT}</span>
              </div>
              <div style={{ display: 'flex', height: '28px' }}>
                {secondaryShades.map((shade, idx) => (
                  <div key={idx} style={{ flex: 1, backgroundColor: shade }} title={shade} />
                ))}
              </div>
            </div>

            {/* Tertiary Swatch Card */}
            <div
              style={{
                borderRadius: RADII.xl,
                overflow: 'hidden',
                boxShadow: SHADOWS.card
              }}
            >
              <div
                style={{
                  backgroundColor: COLORS.tertiary.DEFAULT,
                  color: COLORS.tertiary.foreground,
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: TYPOGRAPHY.fontWeight.bold,
                  fontSize: TYPOGRAPHY.fontSize.base
                }}
              >
                <span>Tertiary</span>
                <span style={{ opacity: 0.9 }}>{COLORS.tertiary.DEFAULT}</span>
              </div>
              <div style={{ display: 'flex', height: '28px' }}>
                {tertiaryShades.map((shade, idx) => (
                  <div key={idx} style={{ flex: 1, backgroundColor: shade }} title={shade} />
                ))}
              </div>
            </div>

            {/* Neutral Swatch Card */}
            <div
              style={{
                borderRadius: RADII.xl,
                overflow: 'hidden',
                boxShadow: SHADOWS.card,
                backgroundColor: COLORS.neutral.white,
                border: `1px solid ${COLORS.neutral.border}`
              }}
            >
              <div
                style={{
                  backgroundColor: COLORS.neutral.surfaceSubtle,
                  color: COLORS.neutral.textPrimary,
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: TYPOGRAPHY.fontWeight.bold,
                  fontSize: TYPOGRAPHY.fontSize.base
                }}
              >
                <span>Neutral</span>
                <span style={{ color: COLORS.neutral.textSecondary }}>{COLORS.neutral.DEFAULT}</span>
              </div>
              <div style={{ display: 'flex', height: '28px' }}>
                {neutralShades.map((shade, idx) => (
                  <div key={idx} style={{ flex: 1, backgroundColor: shade }} title={shade} />
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Typography */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Headline Card */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium }}>
                  Headline
                </span>
                <span style={{ color: COLORS.neutral.textMuted, fontSize: TYPOGRAPHY.fontSize.sm }}>
                  Geist
                </span>
              </div>
              <div
                style={{
                  fontFamily: TYPOGRAPHY.fontFamily.headline,
                  fontSize: '72px',
                  lineHeight: 1,
                  fontWeight: TYPOGRAPHY.fontWeight.bold,
                  color: COLORS.neutral.textPrimary,
                  textAlign: 'center',
                  padding: '16px 0'
                }}
              >
                Aa
              </div>
            </div>

            {/* Body Card */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium }}>
                  Body
                </span>
                <span style={{ color: COLORS.neutral.textMuted, fontSize: TYPOGRAPHY.fontSize.sm }}>
                  Inter
                </span>
              </div>
              <div
                style={{
                  fontFamily: TYPOGRAPHY.fontFamily.body,
                  fontSize: '72px',
                  lineHeight: 1,
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  color: COLORS.tertiary[700],
                  textAlign: 'center',
                  padding: '16px 0'
                }}
              >
                Aa
              </div>
            </div>

            {/* Label Card */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium }}>
                  Label
                </span>
                <span style={{ color: COLORS.neutral.textMuted, fontSize: TYPOGRAPHY.fontSize.sm }}>
                  Inter
                </span>
              </div>
              <div
                style={{
                  fontFamily: TYPOGRAPHY.fontFamily.label,
                  fontSize: '72px',
                  lineHeight: 1,
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
                  color: COLORS.tertiary[600],
                  textAlign: 'center',
                  padding: '16px 0'
                }}
              >
                Aa
              </div>
            </div>
          </div>

          {/* Column 3: Components Group A */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Buttons Card */}
            <div style={cardStyle}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="inverted">Inverted</Button>
                <Button variant="outlined">Outlined</Button>
              </div>
            </div>

            {/* Progress Bars Card */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
              <ProgressBar variant="primary" value={60} height={6} />
              <ProgressBar variant="secondary" value={75} height={6} />
              <ProgressBar variant="tertiary" value={45} height={6} />
            </div>

            {/* Small icon & Pill badge row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px' }}>
              {/* Square icon button */}
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <IconButton
                  shape="square"
                  colorVariant="tertiary"
                  aria-label="Edit item"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  }
                />
              </div>

              {/* Label Pill Badge */}
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <Badge
                  variant="primary"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  }
                >
                  Label
                </Badge>
              </div>
            </div>
          </div>

          {/* Column 4: Components Group B */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Search Input Card */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SearchInput
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                wrapperStyle={{ maxWidth: '100%' }}
              />
            </div>

            {/* NavDock Card */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
              <NavDock
                activeId={activeDockTab}
                onChange={(id) => setActiveDockTab(id)}
              />
            </div>

            {/* Circular Action Icons Card */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px' }}>
              {/* Magic wand (Purple) */}
              <IconButton
                shape="circle"
                colorVariant="primary"
                aria-label="Magic action"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 4V2m0 16v-2M8 9h2m10 0h2m-4.2 7.8 1.4 1.4M18.8 4.8l-1.4 1.4M4.2 18.2l1.4-1.4M5.6 5.6 4.2 4.2" />
                    <path d="m14 14-8 8" />
                  </svg>
                }
              />
              {/* Blocks / Category (Blue) */}
              <IconButton
                shape="circle"
                colorVariant="secondary"
                aria-label="Categories"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                }
              />
              {/* Tag / Filter (Dark) */}
              <IconButton
                shape="circle"
                colorVariant="tertiary"
                aria-label="Tag item"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                }
              />
              {/* Trash / Delete (Red) */}
              <IconButton
                shape="circle"
                colorVariant="danger"
                aria-label="Delete item"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
