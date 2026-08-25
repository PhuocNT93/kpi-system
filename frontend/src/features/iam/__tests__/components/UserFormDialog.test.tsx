import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { mswServer } from '../../../../test-setup';
import { UserFormDialog } from '../../components/UserFormDialog';
import { AuthProvider } from '../../../../shared/auth/AuthContext';

const BASE = 'http://localhost:8080';

function renderDialog(props: { user?: Parameters<typeof UserFormDialog>[0]['user'] }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <UserFormDialog isOpen={true} user={props.user} onClose={() => {}} />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const mockRolesResponse = {
  success: true, message: 'OK',
  data: [{ id: 'r1', code: 'HR_ADMIN', name: 'HR Admin', description: null, permission_codes: [], created_at: '', updated_at: '' }],
  meta: { request_id: 'x', timestamp: '' },
};

describe('UserFormDialog — create mode', () => {
  it('shows validation errors for empty submit', async () => {
    const user = userEvent.setup();
    mswServer.use(http.get(`${BASE}/api/iam/roles`, () => HttpResponse.json(mockRolesResponse)));
    renderDialog({});
    await user.click(screen.getByRole('button', { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('shows DUPLICATE_EMAIL field error from backend 409', async () => {
    const user = userEvent.setup();
    mswServer.use(http.get(`${BASE}/api/iam/roles`, () => HttpResponse.json(mockRolesResponse)));
    renderDialog({});
    await waitFor(() => screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), 'Dup User');
    await user.type(screen.getByLabelText(/email/i), 'duplicate@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.selectOptions(screen.getByLabelText(/role/i), 'HR_ADMIN');
    await user.click(screen.getByRole('button', { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByText(/already registered/i)).toBeInTheDocument();
    });
  });
});
