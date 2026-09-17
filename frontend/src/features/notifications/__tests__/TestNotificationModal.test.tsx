/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestNotificationModal } from '../components/TestNotificationModal';
import { ThemeProvider } from '@/shared/theme';
import { AuthContext } from '@/shared/auth/auth-context';
import { notificationApi } from '../api/notification-api';

vi.mock('../api/notification-api', () => ({
  notificationApi: {
    testSmtp: vi.fn(),
  },
}));

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

describe('TestNotificationModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render button for EMPLOYEE role', () => {
    const { container } = render(
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
          <TestNotificationModal />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/Test Notification/i)).not.toBeInTheDocument();
  });

  it('renders button for SYSTEM_ADMIN and opens modal on click', () => {
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
          <TestNotificationModal />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    const btn = screen.getByRole('button', { name: /Test Notification/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    expect(screen.getByText(/Thử Nghiệm Gửi Thông Báo SMTP/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('admin@company.com')).toBeInTheDocument();
  });

  it('renders button for HR_ADMIN', () => {
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
          <TestNotificationModal />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /Test Notification/i })).toBeInTheDocument();
  });

  it('submits form and displays success result', async () => {
    (notificationApi.testSmtp as any).mockResolvedValue({
      success: true,
      message: 'Test email successfully sent via Google SMTP',
      messageId: '<test-msg-123@google.com>',
      subject: '[TEST SMTP] Cycle Started',
    });

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
          <TestNotificationModal />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Test Notification/i }));

    const submitBtn = screen.getByRole('button', { name: /Gửi Test Email Ngay/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Test email successfully sent via Google SMTP/i)).toBeInTheDocument();
      expect(screen.getByText(/<test-msg-123@google.com>/i)).toBeInTheDocument();
    });

    expect(notificationApi.testSmtp).toHaveBeenCalledWith({
      recipient_email: 'admin@company.com',
      notification_type: 'CYCLE_OPENED',
      locale: 'vi',
    });
  });

  it('displays error message when SMTP sending fails', async () => {
    (notificationApi.testSmtp as any).mockResolvedValue({
      success: false,
      message: 'Failed to send test email via Google SMTP: Invalid login',
      error: '535-5.7.8 Username and Password not accepted',
    });

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
          <TestNotificationModal />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Test Notification/i }));
    fireEvent.click(screen.getByRole('button', { name: /Gửi Test Email Ngay/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to send test email via Google SMTP: Invalid login/i)).toBeInTheDocument();
      expect(screen.getByText(/535-5.7.8 Username and Password not accepted/i)).toBeInTheDocument();
    });
  });

  it('allows user to enter custom recipient email and sends test email to that address', async () => {
    (notificationApi.testSmtp as any).mockResolvedValue({
      success: true,
      message: 'Email sent',
      messageId: '<custom-123@google.com>',
    });

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
          <TestNotificationModal />
        </AuthContext.Provider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Test Notification/i }));

    const emailInput = screen.getByTestId('recipient-email-input');
    fireEvent.change(emailInput, { target: { value: 'custom-recipient@example.com' } });
    expect(emailInput).toHaveValue('custom-recipient@example.com');

    const submitBtn = screen.getByRole('button', { name: /Gửi Test Email Ngay/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(notificationApi.testSmtp).toHaveBeenCalledWith({
        recipient_email: 'custom-recipient@example.com',
        notification_type: 'CYCLE_OPENED',
        locale: 'vi',
      });
    });
  });
});
