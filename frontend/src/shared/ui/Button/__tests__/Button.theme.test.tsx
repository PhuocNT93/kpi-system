/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Button } from '../Button';
import { ThemeContext } from '@/shared/theme/theme-context-def';

function renderWithTheme(isDark: boolean) {
  return render(
    <ThemeContext.Provider value={{ theme: isDark ? 'dark' : 'light', isDark, toggleTheme: () => {}, setTheme: () => {} }}>
      <Button variant="outlined" size="sm">Edit</Button>
    </ThemeContext.Provider>
  );
}

describe('Button outlined variant', () => {
  afterEach(cleanup);

  it('uses a light, readable text color in dark theme', () => {
    renderWithTheme(true);
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveStyle({ color: '#e2e8f0' });
  });

  it('keeps the light-theme color outside dark theme', () => {
    renderWithTheme(false);
    expect(screen.getByRole('button', { name: 'Edit' })).not.toHaveStyle({ color: '#e2e8f0' });
  });
});
