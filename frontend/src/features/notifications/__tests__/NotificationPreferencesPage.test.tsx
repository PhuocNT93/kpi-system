/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationPreferencesPage } from '../pages/NotificationPreferencesPage';
import { ThemeProvider } from '@/shared/theme';
import { AuthContext } from '@/shared/auth/auth-context';
import { notificationApi } from '../api/notification-api';

vi.mock('../api/notification-api', () => ({
  notificationApi: {
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
    testSmtp: vi.fn(),
  },
}));

const mockPreferences = [
  {
    notification_type: 'CYCLE_OPENED',
    enabled: true,
    is_mandatory: false,
  },
  {
    notification_type: 'RESULT_PUBLISHED',
    enabled: true,
    is_mandatory: true,
  },
];

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@company.com',
  name: 'Admin User',
  role: 'SYSTEM_ADMIN' as const,
};

const mockHrUser = {
  id: 'hr-1',
  email: 'hr@company.com',
  name: 'HR User',
  role: 'HR_ADMIN' as const,
};

const mockEmployeeUser = {
  id: 'emp-1',
  email: 'emp@company.com',
  name: 'Emp User',
  role: 'EMPLOYEE' as const,
};

describe('NotificationPreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (notificationApi.getUserPreferences as any).mockResolvedValue(mockPreferences);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders preferences list but does NOT render Test Notification button for EMPLOYEE role', async () => {
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{
            user: mockEmployeeUser,
            isAuthenticated: true,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationPreferencesPage />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Tùy chọn nhận thông báo qua Email/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Test Notification/i })).not.toBeInTheDocument();
  });

  it('renders Test Notification button for SYSTEM_ADMIN role on notification preferences page', async () => {
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{
            user: mockAdminUser,
            isAuthenticated: true,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationPreferencesPage />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Tùy chọn nhận thông báo qua Email/i)).toBeInTheDocument();
    });

    const testBtn = screen.getByRole('button', { name: /Test Notification/i });
    expect(testBtn).toBeInTheDocument();
  });

  it('renders Test Notification button for HR_ADMIN role on notification preferences page', async () => {
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{
            user: mockHrUser,
            isAuthenticated: true,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationPreferencesPage />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Tùy chọn nhận thông báo qua Email/i)).toBeInTheDocument();
    });

    const testBtn = screen.getByRole('button', { name: /Test Notification/i });
    expect(testBtn).toBeInTheDocument();
  });
});
