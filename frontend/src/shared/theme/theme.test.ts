import { describe, expect, it } from 'vitest';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

describe('Lumina HR Theme Tokens', () => {
  it('defines primary palette colors correctly', () => {
    expect(COLORS.primary.DEFAULT).toBe('#7C3AED');
    expect(COLORS.primary[600]).toBe('#7C3AED');
    expect(COLORS.primary[50]).toBe('#F5F3FF');
    expect(COLORS.primary[900]).toBe('#4C1D95');
  });

  it('defines secondary palette colors correctly', () => {
    expect(COLORS.secondary.DEFAULT).toBe('#2563EB');
    expect(COLORS.secondary[600]).toBe('#2563EB');
    expect(COLORS.secondary[50]).toBe('#EFF6FF');
  });

  it('defines tertiary palette colors correctly', () => {
    expect(COLORS.tertiary.DEFAULT).toBe('#0F172A');
    expect(COLORS.tertiary[900]).toBe('#0F172A');
  });

  it('defines neutral palette colors correctly', () => {
    expect(COLORS.neutral.DEFAULT).toBe('#F8F9FC');
    expect(COLORS.neutral[50]).toBe('#F8F9FC');
    expect(COLORS.neutral.white).toBe('#FFFFFF');
  });

  it('defines typography and radii tokens', () => {
    expect(TYPOGRAPHY.fontFamily.headline).toContain('Geist');
    expect(TYPOGRAPHY.fontFamily.body).toContain('Inter');
    expect(RADII.md).toBe('0.5rem');
    expect(RADII.full).toBe('9999px');
  });
});
