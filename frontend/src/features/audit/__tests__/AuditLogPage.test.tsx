/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { AuditLogPage } from '../pages/AuditLogPage';
import * as authContextModule from '../../../shared/auth/auth-context';
import type { AuthUser } from '../../../shared/auth/auth-models';
import * as auditHooksModule from '../hooks/useAuditLogs';
import type { WireAuditLog, WirePaginatedAuditLogs } from '../api/audit-types';

vi.mock('../../../shared/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useAuditLogs', () => ({
  useAuditLogs: vi.fn(),
}));

describe('AuditLogPage Frontend Tests (TC24 - TC26)', () => {
  let queryClient: QueryClient;

  const mockLogs: WireAuditLog[] = [
    {
      auditLogId: '11111111-1111-1111-1111-111111111111',
      entityType: 'EVALUATION',
      entityId: '22222222-2222-2222-2222-222222222222',
      action: 'APPROVE',
      fieldName: null,
      oldValue: JSON.stringify({ status: 'SUBMITTED' }),
      newValue: JSON.stringify({ status: 'APPROVED' }),
      reason: 'Standard review approved by manager',
      performedBy: '33333333-3333-3333-3333-333333333333',
      performedByName: 'Sarah Manager',
      performedAt: '2026-03-15T10:30:00.000Z',
      source: 'API',
    },
  ];

  const mockUiTranslations = {
    en: {
      pageTitle: 'System Audit Logs',
      page_title: 'System Audit Logs',
      pageSubtitle: 'Immutable history of business operations, configurations, and score calculations (Read-Only)',
      roleSystemAdmin: 'System Admin (Full Audit Access)',
      roleHrAdmin: 'HR Admin (Scoped to Business Entities)',
      unauthorizedTitle: 'Access Denied (403 Forbidden)',
      unauthorizedDesc: 'You do not have permission to view system audit logs. Only System Admin and HR Admin are authorized to access this resource.',
      modalTitle: 'Audit Log Details',
      modal_title: 'Audit Log Details',
      modalBadge: 'Read-Only / Append-Only',
      modal_badge: 'Read-Only / Append-Only',
      sectionMeta: 'Execution Metadata',
      sectionDiff: 'State Change Comparison (Before vs After)',
      stateBefore: 'Before (Previous State)',
      state_before: 'Before (Previous State)',
      stateAfter: 'After (New State)',
      state_after: 'After (New State)',
      colActions: 'Actions',
      btnDetail: 'Details',
      btn_detail: 'Details',
      btnClose: 'Close',
      btn_close: 'Close',
      filterTitle: 'Audit Filters',
    },
    vi: {
      pageTitle: 'Nhật ký kiểm toán hệ thống',
      page_title: 'Nhật ký kiểm toán hệ thống',
      pageSubtitle: 'Lịch sử ghi vết toàn bộ thao tác nghiệp vụ, cấu hình và tính toán điểm (Chỉ đọc)',
      roleSystemAdmin: 'Quản trị hệ thống (Toàn quyền kiểm toán)',
      roleHrAdmin: 'Quản trị nhân sự (Phạm vi nghiệp vụ)',
      unauthorizedTitle: 'Không có quyền truy cập (403 Forbidden)',
      unauthorizedDesc: 'Bạn không có quyền xem nhật ký kiểm toán hệ thống. Chỉ System Admin và HR Admin mới được phép truy cập tài nguyên này.',
      modalTitle: 'Chi tiết bản ghi kiểm toán',
      modal_title: 'Chi tiết bản ghi kiểm toán',
      modalBadge: 'Bất biến / Chỉ đọc',
      sectionMeta: 'Thông tin thực thi',
      sectionDiff: 'So sánh thay đổi trạng thái (Trước & Sau)',
      stateBefore: 'Giá trị trước (Old Value)',
      stateAfter: 'Giá trị mới (New Value)',
      colActions: 'Thao tác',
      btnDetail: 'Chi tiết',
      btn_detail: 'Chi tiết',
      btnClose: 'Đóng',
      filterTitle: 'Bộ lọc kiểm toán',
    },
  };

  beforeEach(() => {
    localStorage.setItem('kpi_ui_translations', JSON.stringify(mockUiTranslations));
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: {
        id: 'usr-1',
        email: 'hr@example.com',
        role: 'HR_ADMIN',
        employeeId: 'emp-1',
      } as AuthUser,
      isAuthenticated: true,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
  });

  afterEach(() => {
    localStorage.clear();
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AuditLogPage />
      </QueryClientProvider>
    );

  // ── TC24: Table & Filter Rendering (Default English Baseline) ─────────────
  it('TC24: Renders audit logs table, metadata, and filter bar in default English', () => {
    vi.mocked(auditHooksModule.useAuditLogs).mockReturnValue({
      data: { logs: mockLogs, total: 1 },
      isPending: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<WirePaginatedAuditLogs, Error>);

    renderComponent();

    expect(screen.getByText('System Audit Logs')).toBeInTheDocument();
    expect(screen.getAllByText('APPROVE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EVALUATION').length).toBeGreaterThan(0);
    expect(screen.getByText('Sarah Manager')).toBeInTheDocument();
    expect(screen.getByText(/Standard review approved by manager/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Details/i })).toBeInTheDocument();
  });

  // ── TC25: Read-Only Detail Modal ───────────────────────────────────────────
  it('TC25: Opens read-only detail modal with before/after diffs and no mutation controls', () => {
    vi.mocked(auditHooksModule.useAuditLogs).mockReturnValue({
      data: { logs: mockLogs, total: 1 },
      isPending: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<WirePaginatedAuditLogs, Error>);

    renderComponent();

    // Click "Details"
    const detailBtn = screen.getByRole('button', { name: /Details/i });
    fireEvent.click(detailBtn);

    // Assert modal title and read-only notice
    expect(screen.getByText('Audit Log Details')).toBeInTheDocument();
    expect(screen.getByText(/Read-Only \/ Append-Only/i)).toBeInTheDocument();
    expect(screen.getByText('Before (Previous State)')).toBeInTheDocument();
    expect(screen.getByText('After (New State)')).toBeInTheDocument();

    // Assert that NO edit, delete, or replay controls exist
    expect(screen.queryByRole('button', { name: /edit|chỉnh sửa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete|xóa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /replay/i })).not.toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getAllByRole('button', { name: /close/i })[0];
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Audit Log Details')).not.toBeInTheDocument();
  });

  // ── TC26: 403 Forbidden State Handling ─────────────────────────────────────
  it('TC26: Renders clear unauthorized alert when user lacks audit permissions', () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: {
        id: 'usr-2',
        email: 'emp@example.com',
        role: 'EMPLOYEE',
        employeeId: 'emp-2',
      } as AuthUser,
      isAuthenticated: true,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(auditHooksModule.useAuditLogs).mockReturnValue({
      data: undefined,
      isPending: false,
      isSuccess: false,
      isError: true,
      error: Object.assign(new Error('Forbidden'), { status: 403 }),
      refetch: vi.fn(),
    } as unknown as UseQueryResult<WirePaginatedAuditLogs, Error>);

    renderComponent();

    expect(screen.getByText(/Access Denied \(403 Forbidden\)/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // ── TC28: i18n Vietnamese Localization Switching ───────────────────────────
  it('TC28: Switches to Vietnamese translation when preferred locale is vi', () => {
    localStorage.setItem('kpi_locale', 'vi');

    vi.mocked(auditHooksModule.useAuditLogs).mockReturnValue({
      data: { logs: mockLogs, total: 1 },
      isPending: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<WirePaginatedAuditLogs, Error>);

    renderComponent();

    expect(screen.getByText('Nhật ký kiểm toán hệ thống')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chi tiết/i })).toBeInTheDocument();

    localStorage.removeItem('kpi_locale');
  });
});
