/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Sidebar } from '../Sidebar';
import { ThemeProvider } from '@/shared/theme';

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-1',
      name: 'System Administrator',
      role: 'HR_ADMIN',
    },
  }),
}));

describe('Sidebar Component & Collapsible Sections', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all navigation sections for admin role', () => {
    render(
      <ThemeProvider>
        <Sidebar activeItemId="dashboard" />
      </ThemeProvider>
    );

    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Reporting')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Criteria & Rules')).toBeInTheDocument();
  });

  it('collapses section items when section header is clicked', () => {
    render(
      <ThemeProvider>
        <Sidebar activeItemId="dashboard" />
      </ThemeProvider>
    );

    // Criteria & Rules should initially be visible
    expect(screen.getByText('Criteria & Rules')).toBeInTheDocument();

    // Click Configuration section header to collapse
    const configHeader = screen.getByText('Configuration');
    fireEvent.click(configHeader);

    // Items inside Configuration should now be hidden
    expect(screen.queryByText('Criteria & Rules')).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(configHeader);
    expect(screen.getByText('Criteria & Rules')).toBeInTheDocument();
  });

  it('automatically keeps active item section expanded', () => {
    // Pre-seed localStorage with configuration collapsed
    localStorage.setItem('kpi-sidebar-sections', JSON.stringify({ configuration: true }));

    // But render with an active item inside configuration
    render(
      <ThemeProvider>
        <Sidebar activeItemId="criteria" />
      </ThemeProvider>
    );

    // Because 'criteria' is active, configuration should auto-expand
    expect(screen.getByText('Criteria & Rules')).toBeInTheDocument();
  });

  it('calls onSelectItem when an item is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ThemeProvider>
        <Sidebar activeItemId="dashboard" onSelectItem={onSelect} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('User Guide'));
    expect(onSelect).toHaveBeenCalledWith('user-guide');
  });
});
