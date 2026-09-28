/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedNotificationsPage } from '../pages/UnifiedNotificationsPage';
import { ThemeProvider } from '@/shared/theme';
import { AuthContext, type AuthContextValue } from '@/shared/auth/auth-context';

vi.mock('../pages/NotificationPreferencesPage', () => ({
  NotificationPreferencesPage: () => <div data-testid="mock-preferences-page">Preferences Content</div>,
}));

vi.mock('../pages/NotificationTemplatesPage', () => ({
  NotificationTemplatesPage: () => <div data-testid="mock-templates-page">Templates Content</div>,
}));

vi.mock('../pages/NotificationLogPage', () => ({
  NotificationLogPage: () => <div data-testid="mock-logs-page">Logs Content</div>,
}));

const createMockAuth = (user: AuthContextValue['user']): AuthContextValue => ({
  user,
  isAuthenticated: !!user,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
});

describe('UnifiedNotificationsPage (Roles Matrix & Tabs)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders all 3 tabs for SYSTEM_ADMIN and defaults to preferences tab', () => {
    const adminUser = {
      id: 'admin-1',
      name: 'System Admin',
      email: 'admin@company.com',
      role: 'SYSTEM_ADMIN' as const,
    };

    render(
      <AuthContext.Provider value={createMockAuth(adminUser)}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/admin/notifications']}>
            <UnifiedNotificationsPage />
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    // Header title
    expect(screen.getByText(/Notifications Hub/i)).toBeInTheDocument();

    // 3 Tabs should be present for Admin
    expect(screen.getByText(/Tùy chọn thông báo/i)).toBeInTheDocument();
    expect(screen.getByText(/Mẫu Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Nhật ký gửi/i)).toBeInTheDocument();

    // Default tab active is preferences
    expect(screen.getByTestId('mock-preferences-page')).toBeInTheDocument();
  });

  it('renders ONLY preferences tab for EMPLOYEE role based on roles matrix', () => {
    const employeeUser = {
      id: 'emp-1',
      name: 'Regular Employee',
      email: 'employee@company.com',
      role: 'EMPLOYEE' as const,
    };

    render(
      <AuthContext.Provider value={createMockAuth(employeeUser)}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/admin/notifications']}>
            <UnifiedNotificationsPage />
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    // Only personal preferences tab is available
    expect(screen.getByText(/Tùy chọn thông báo/i)).toBeInTheDocument();
    expect(screen.queryByText(/Mẫu Email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nhật ký gửi/i)).not.toBeInTheDocument();

    expect(screen.getByTestId('mock-preferences-page')).toBeInTheDocument();
  });

  it('switches between tabs on click for HR_ADMIN', () => {
    const hrUser = {
      id: 'hr-1',
      name: 'HR Admin',
      email: 'hr@company.com',
      role: 'HR_ADMIN' as const,
    };

    render(
      <AuthContext.Provider value={createMockAuth(hrUser)}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/admin/notifications']}>
            <UnifiedNotificationsPage />
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    // Click on Templates tab
    const templatesTabBtn = screen.getByText(/Mẫu Email/i).closest('button');
    expect(templatesTabBtn).not.toBeNull();
    fireEvent.click(templatesTabBtn!);

    expect(screen.getByTestId('mock-templates-page')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-preferences-page')).not.toBeInTheDocument();

    // Click on Delivery Logs tab
    const logsTabBtn = screen.getByText(/Nhật ký gửi/i).closest('button');
    expect(logsTabBtn).not.toBeNull();
    fireEvent.click(logsTabBtn!);

    expect(screen.getByTestId('mock-logs-page')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-templates-page')).not.toBeInTheDocument();
  });
});
