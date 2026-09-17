/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalibrationPage } from '../pages/CalibrationPage';
import * as authContextModule from '@/shared/auth/auth-context';
import type { AuthContextValue } from '@/shared/auth/auth-context';
import * as cycleHooksModule from '../../evaluation-cycles/hooks/use-evaluation-cycles';
import * as calibrationHooksModule from '../hooks/use-calibration';
import type { CalibrationDistribution, CalibrationSession, CalibrationSessionDetail } from '../types/calibration-types';

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../evaluation-cycles/hooks/use-evaluation-cycles', () => ({
  useEvaluationCyclesQuery: vi.fn(),
}));

vi.mock('../hooks/use-calibration', () => ({
  useCalibrationSessions: vi.fn(),
  useCalibrationSessionDetail: vi.fn(),
  useCreateCalibrationSessionMutation: vi.fn(),
  useAdjustScoreMutation: vi.fn(),
  useFinalizeSessionMutation: vi.fn(),
}));

// Mock child components to keep unit test isolated and fast
vi.mock('../components/CalibrationDistributionChart', () => ({
  CalibrationDistributionChart: ({ distribution }: { distribution: CalibrationDistribution }) => (
    <div data-testid="distribution-chart">Phân bố cho {distribution?.totalEvaluations ?? 0} nhân viên</div>
  ),
}));

vi.mock('../components/CreateSessionModal', () => ({
  CreateSessionModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="create-session-modal">Create Modal</div> : null),
}));

vi.mock('../components/CalibrationAdjustmentModal', () => ({
  CalibrationAdjustmentModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="adjustment-modal">Adjustment Modal</div> : null,
}));

describe('CalibrationPage Integration & RBAC', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(calibrationHooksModule.useCreateCalibrationSessionMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useCreateCalibrationSessionMutation>);

    vi.mocked(calibrationHooksModule.useAdjustScoreMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useAdjustScoreMutation>);

    vi.mocked(calibrationHooksModule.useFinalizeSessionMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useFinalizeSessionMutation>);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('denies access with 403 Forbidden message when user is not HR_ADMIN', () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        role: 'EMPLOYEE',
        name: 'Nhân viên',
      },
      isAuthenticated: true,
    } as unknown as AuthContextValue);

    vi.mocked(cycleHooksModule.useEvaluationCyclesQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof cycleHooksModule.useEvaluationCyclesQuery>);
    vi.mocked(calibrationHooksModule.useCalibrationSessions).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useCalibrationSessions>);
    vi.mocked(calibrationHooksModule.useCalibrationSessionDetail).mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useCalibrationSessionDetail>);

    render(
      <QueryClientProvider client={queryClient}>
        <CalibrationPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Không có quyền truy cập (403 Forbidden)')).toBeInTheDocument();
    expect(
      screen.getByText(/Tính năng Hiệu chuẩn điểm \(Calibration\) chỉ dành riêng cho Quản trị viên nhân sự/i)
    ).toBeInTheDocument();
  });

  it('renders calibration page header and session controls for HR_ADMIN', () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        role: 'HR_ADMIN',
        name: 'Quản trị viên Nhân sự',
      },
      isAuthenticated: true,
    } as unknown as AuthContextValue);

    vi.mocked(cycleHooksModule.useEvaluationCyclesQuery).mockReturnValue({
      data: [{ id: 'cycle-1', name: 'Đánh giá năm 2026', status: 'CALIBRATION' }],
      isLoading: false,
    } as unknown as ReturnType<typeof cycleHooksModule.useEvaluationCyclesQuery>);

    vi.mocked(calibrationHooksModule.useCalibrationSessions).mockReturnValue({
      data: [
        {
          calibrationSessionId: 'sess-1',
          evaluationCycleId: 'cycle-1',
          scopeType: 'ORG',
          scopeId: null,
          scopeName: 'Toàn công ty',
          status: 'OPEN',
          totalEvaluations: 25,
          createdBy: 'usr-admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as CalibrationSession,
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useCalibrationSessions>);

    vi.mocked(calibrationHooksModule.useCalibrationSessionDetail).mockReturnValue({
      data: {
        session: {
          calibrationSessionId: 'sess-1',
          evaluationCycleId: 'cycle-1',
          scopeType: 'ORG',
          scopeId: null,
          scopeName: 'Toàn công ty',
          status: 'OPEN',
          totalEvaluations: 25,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        distribution: {
          totalEvaluations: 25,
          averageScore: 82.4,
          medianScore: 81.5,
          minScore: 65.0,
          maxScore: 95.0,
          buckets: [],
        },
        evaluations: [
          {
            evaluationId: 'eval-1',
            employeeId: 'emp-1',
            employeeName: 'Trần Văn B',
            employeeCode: 'EMP-001',
            departmentName: 'Kỹ thuật',
            teamName: 'Nền tảng',
            calculatedScore: 78.0,
            finalScore: 82.0,
            status: 'CALIBRATION',
            isLocked: false,
            latestAdjustmentReason: 'Xuất sắc vượt chỉ tiêu',
            latestAdjustedByName: 'HR Admin',
            latestAdjustedAt: new Date().toISOString(),
          },
        ],
        adjustments: [],
      } as unknown as CalibrationSessionDetail,
      isLoading: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useCalibrationSessionDetail>);

    render(
      <QueryClientProvider client={queryClient}>
        <CalibrationPage />
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { name: /Hiệu chuẩn điểm đánh giá/i })).toBeInTheDocument();
    expect(screen.getByText('Trần Văn B')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(screen.getByText('78.00')).toBeInTheDocument(); // original score
    expect(screen.getByText('82.00')).toBeInTheDocument(); // final score
    expect(screen.getByText('Đã hiệu chuẩn')).toBeInTheDocument();
    expect(screen.getByText(/Xuất sắc vượt chỉ tiêu/i)).toBeInTheDocument();
    expect(screen.getByTestId('distribution-chart')).toBeInTheDocument();
  });

  it('renders finalized session state with read-only badge', () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        role: 'HR_ADMIN',
        name: 'Quản trị viên Nhân sự',
      },
      isAuthenticated: true,
    } as unknown as AuthContextValue);

    vi.mocked(cycleHooksModule.useEvaluationCyclesQuery).mockReturnValue({
      data: [{ id: 'cycle-1', name: 'Đánh giá năm 2026', status: 'ACTIVE' }],
      isLoading: false,
    } as unknown as ReturnType<typeof cycleHooksModule.useEvaluationCyclesQuery>);

    vi.mocked(calibrationHooksModule.useCalibrationSessions).mockReturnValue({
      data: [
        {
          calibrationSessionId: 'sess-1',
          evaluationCycleId: 'cycle-1',
          scopeType: 'ORG',
          scopeId: null,
          scopeName: 'Toàn công ty',
          status: 'FINALIZED',
          totalEvaluations: 1,
          createdBy: 'usr-admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as CalibrationSession,
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useCalibrationSessions>);

    vi.mocked(calibrationHooksModule.useCalibrationSessionDetail).mockReturnValue({
      data: {
        session: {
          calibrationSessionId: 'sess-1',
          evaluationCycleId: 'cycle-1',
          scopeType: 'ORG',
          scopeId: null,
          scopeName: 'Toàn công ty',
          status: 'FINALIZED',
          totalEvaluations: 1,
          createdBy: 'usr-admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        distribution: {
          totalEvaluations: 1,
          averageScore: 85.0,
          medianScore: 85.0,
          minScore: 85.0,
          maxScore: 85.0,
          buckets: [],
        },
        evaluations: [
          {
            evaluationId: 'eval-1',
            employeeId: 'emp-1',
            employeeName: 'Trần Văn B',
            employeeCode: 'EMP-001',
            departmentName: 'Kỹ thuật',
            teamName: 'Nền tảng',
            calculatedScore: 85.0,
            finalScore: 85.0,
            status: 'PUBLISHED',
            isLocked: true,
            latestAdjustmentReason: null,
            latestAdjustedByName: null,
            latestAdjustedAt: null,
          },
        ],
        adjustments: [],
      } as unknown as CalibrationSessionDetail,
      isLoading: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useCalibrationSessionDetail>);

    render(
      <QueryClientProvider client={queryClient}>
        <CalibrationPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('ĐÃ CHỐT (FINALIZED)')).toBeInTheDocument();
    expect(screen.getByText('Phiên đã chốt hoàn tất (Chế độ chỉ đọc)')).toBeInTheDocument();
  });

  it('shows confirmation dialog when clicking Finalize Session', async () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        role: 'HR_ADMIN',
        name: 'Quản trị viên Nhân sự',
      },
      isAuthenticated: true,
    } as unknown as AuthContextValue);

    vi.mocked(cycleHooksModule.useEvaluationCyclesQuery).mockReturnValue({
      data: [{ id: 'cycle-1', name: 'Đánh giá năm 2026', status: 'ACTIVE' }],
      isLoading: false,
    } as unknown as ReturnType<typeof cycleHooksModule.useEvaluationCyclesQuery>);

    vi.mocked(calibrationHooksModule.useCalibrationSessions).mockReturnValue({
      data: [
        {
          calibrationSessionId: 'sess-1',
          evaluationCycleId: 'cycle-1',
          scopeType: 'ORG',
          scopeId: null,
          scopeName: 'Toàn công ty',
          status: 'OPEN',
          totalEvaluations: 5,
          createdBy: 'usr-admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as CalibrationSession,
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useCalibrationSessions>);

    vi.mocked(calibrationHooksModule.useCalibrationSessionDetail).mockReturnValue({
      data: {
        session: {
          calibrationSessionId: 'sess-1',
          evaluationCycleId: 'cycle-1',
          scopeType: 'ORG',
          scopeId: null,
          scopeName: 'Toàn công ty',
          status: 'OPEN',
          totalEvaluations: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        distribution: {
          totalEvaluations: 5,
          averageScore: 80.0,
          medianScore: 80.0,
          minScore: 75.0,
          maxScore: 85.0,
          buckets: [],
        },
        evaluations: [],
        adjustments: [],
      } as unknown as CalibrationSessionDetail,
      isLoading: false,
    } as unknown as ReturnType<typeof calibrationHooksModule.useCalibrationSessionDetail>);

    render(
      <QueryClientProvider client={queryClient}>
        <CalibrationPage />
      </QueryClientProvider>
    );

    const finalizeBtn = screen.getByRole('button', { name: /Chốt phiên hiệu chuẩn/i });
    fireEvent.click(finalizeBtn);

    expect(screen.getByText('Xác nhận chốt phiên hiệu chuẩn?')).toBeInTheDocument();
    expect(screen.getByText(/Thao tác này mang tính quyết định và không thể hoàn tác/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xác nhận chốt & Xuất bản/i })).toBeInTheDocument();
  });
});
