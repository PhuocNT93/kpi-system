/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Header } from '../Header';
import { ThemeProvider } from '@/shared/theme';

describe('Header Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders title, subtitle, and custom actions', () => {
    render(
      <ThemeProvider>
        <Header
          title="Performance Dashboard"
          subtitle="Annual 2026 Cycle"
          actions={<button data-testid="custom-action">Export</button>}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Annual 2026 Cycle')).toBeInTheDocument();
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });

  it('renders theme toggle and toggles dark mode on click', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <Header title="KPI Overview" />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
  });

  it('renders language dropdown and updates locale on change', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <Header title="KPI Overview" />
      </ThemeProvider>
    );

    const langSelect = screen.getByTestId('language-switcher') as HTMLSelectElement;
    expect(langSelect).toBeInTheDocument();
    expect(langSelect.value).toBe('en');

    fireEvent.change(langSelect, { target: { value: 'vi' } });

    expect(langSelect.value).toBe('vi');
    expect(localStorage.getItem('kpi_locale')).toBe('vi');
  });
});
