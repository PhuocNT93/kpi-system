/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationBell } from '../components/NotificationBell';
import { ThemeProvider } from '@/shared/theme';
import { AuthContext } from '@/shared/auth/auth-context';
import { notificationApi } from '../api/notification-api';

vi.mock('../api/notification-api', () => ({
  notificationApi: {
    getMyNotifications: vi.fn(),
    toggleNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'EMPLOYEE' as const,
};

const mockNotifications = [
  {
    notificationLogId: 'notif-1',
    notificationType: 'CYCLE_OPENED',
    subjectRendered: 'Evaluation Cycle 2026 is now open',
    createdAt: new Date().toISOString(),
    readAt: null,
    status: 'SENT',
    retryCount: 0,
    recipientUserAccountId: 'user-1',
    recipientEmail: 'test@example.com',
    localeUsed: 'en',
  },
  {
    notificationLogId: 'notif-2',
    notificationType: 'RESULT_PUBLISHED',
    subjectRendered: 'Evaluation Results Published',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    readAt: new Date().toISOString(),
    status: 'SENT',
    retryCount: 0,
    recipientUserAccountId: 'user-1',
    recipientEmail: 'test@example.com',
    localeUsed: 'en',
  },
];

describe('NotificationBell Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (notificationApi.getMyNotifications as any).mockResolvedValue({
      items: mockNotifications,
      unreadCount: 1,
    });
    (notificationApi.toggleNotificationRead as any).mockResolvedValue(undefined);
    (notificationApi.markAllNotificationsRead as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render when user is not authenticated', () => {
    const { container } = render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{
            user: null,
            isAuthenticated: false,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationBell />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders bell icon and unread count badge when authenticated', async () => {
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{
            user: mockUser,
            isAuthenticated: true,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationBell />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    expect(bellBtn).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('opens dropdown and displays notifications list on click', async () => {
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{
            user: mockUser,
            isAuthenticated: true,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationBell />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Evaluation Cycle 2026 is now open')).toBeInTheDocument();
      expect(screen.getByText('Evaluation Results Published')).toBeInTheDocument();
    });
  });

  it('toggles read/unread status on click event', async () => {
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{
            user: mockUser,
            isAuthenticated: true,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationBell />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Evaluation Cycle 2026 is now open')).toBeInTheDocument();
    });

    const unreadItem = screen.getByText('Evaluation Cycle 2026 is now open');
    fireEvent.click(unreadItem);

    expect(notificationApi.toggleNotificationRead).toHaveBeenCalledWith('notif-1', true);
  });

  it('marks all as read when clicking "Mark all read"', async () => {
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{
            user: mockUser,
            isAuthenticated: true,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationBell />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText(/Mark all read/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Mark all read/i));
    expect(notificationApi.markAllNotificationsRead).toHaveBeenCalled();
  });
});
