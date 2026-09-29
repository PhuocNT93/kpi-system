import { describe, expect, it } from 'vitest';
import { getReportPalette } from '../use-report-palette';

describe('getReportPalette', () => {
  it('returns distinct light and dark palettes', () => {
    const light = getReportPalette(false);
    const dark = getReportPalette(true);

    expect(light).not.toEqual(dark);
    expect(light.surface.toLowerCase()).toBe('#ffffff');
    expect(dark.surface.toLowerCase()).not.toBe('#ffffff');
    expect(dark.inputBg.toLowerCase()).not.toBe('#ffffff');
  });

  it('defines every tone for both themes', () => {
    for (const palette of [getReportPalette(false), getReportPalette(true)]) {
      for (const tone of ['primary', 'success', 'warning', 'info', 'neutral'] as const) {
        expect(palette.tones[tone].fg).toBeTruthy();
        expect(palette.tones[tone].bg).toBeTruthy();
      }
    }
  });
});
