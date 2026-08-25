import { describe, expect, it } from 'vitest';
import { COLORS } from '@/lib/theme';
import { Sidebar, Header, FooterActionBar, AppLayout } from './index';

describe('Layout Components & Design Tokens', () => {
  it('exports all layout components properly', () => {
    expect(Sidebar).toBeDefined();
    expect(Header).toBeDefined();
    expect(FooterActionBar).toBeDefined();
    expect(AppLayout).toBeDefined();
  });

  it('uses proper theme tokens for primary and neutral palettes', () => {
    expect(COLORS.primary.DEFAULT).toBe('#7C3AED');
    expect(COLORS.primary[100]).toBe('#EDE9FE');
    expect(COLORS.primary[50]).toBe('#F5F3FF');
    expect(COLORS.neutral.surfaceSubtle).toBe('#F8F9FC');
  });
});
