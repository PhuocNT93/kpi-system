/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Header } from '../Header';
import { ThemeProvider } from '@/shared/theme';
import { HeaderTrailProvider } from '../HeaderTrailProvider';
import { useHeaderTrail } from '../header-trail';

function HubTab({ label }: { label: string }) {
  useHeaderTrail(label);
  return null;
}

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

  it('shows a "Section › Tab" breadcrumb instead of the title while a hub sets a trail', () => {
    const { rerender } = render(
      <ThemeProvider>
        <HeaderTrailProvider>
          <Header title="System & Security Hub" section="Configuration" />
          <HubTab label="IAM & Roles" />
        </HeaderTrailProvider>
      </ThemeProvider>
    );

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumb).toHaveTextContent('Configuration');
    expect(screen.getByText('IAM & Roles')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();

    // Leaving the hub clears the trail and brings the title back.
    rerender(
      <ThemeProvider>
        <HeaderTrailProvider>
          <Header title="System & Security Hub" section="Configuration" />
        </HeaderTrailProvider>
      </ThemeProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'System & Security Hub' })).toBeInTheDocument();
  });
});
