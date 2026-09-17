/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalibrationDistributionChart } from '../components/CalibrationDistributionChart';
import { CalibrationAdjustmentModal } from '../components/CalibrationAdjustmentModal';
import { CreateSessionModal } from '../components/CreateSessionModal';
import type { CalibrationDistribution } from '../types/calibration-types';

vi.mock('@/features/organization/hooks/useDepartments', () => ({
  useDepartments: () => ({
    data: [
      { id: 'dept-1', name: 'Kỹ thuật', code: 'ENG' },
      { id: 'dept-2', name: 'Nhân sự', code: 'HR' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/features/organization/hooks/useTeams', () => ({
  useTeams: () => ({
    data: [
      { id: 'team-1', name: 'Nền tảng', code: 'PLATFORM' },
      { id: 'team-2', name: 'Kiểm thử', code: 'QA' },
    ],
    isLoading: false,
  }),
}));

describe('CalibrationDistributionChart Component', () => {
  afterEach(() => {
    cleanup();
  });

  const mockDistribution: CalibrationDistribution = {
    totalEvaluations: 12,
    averageScore: 84.5,
    medianScore: 83.0,
    minScore: 68.0,
    maxScore: 96.0,
    buckets: [
      { range: '0-59 (Chưa đạt)', count: 0, percentage: 0 },
      { range: '60-69 (Cần cải thiện)', count: 1, percentage: 8.3 },
      { range: '70-79 (Đạt yêu cầu)', count: 3, percentage: 25.0 },
      { range: '80-89 (Vượt kỳ vọng)', count: 6, percentage: 50.0 },
      { range: '90-100 (Xuất sắc)', count: 2, percentage: 16.7 },
    ],
  };

  it('renders all key summary statistics including median and average', () => {
    render(<CalibrationDistributionChart distribution={mockDistribution} />);

    expect(screen.getByRole('heading', { name: /Phân phối điểm số gốc/i })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // total evaluations
    expect(screen.getByText('84.50')).toBeInTheDocument(); // average
    expect(screen.getByText('83.00')).toBeInTheDocument(); // median
    expect(screen.getByText('68.00 / 96.00')).toBeInTheDocument(); // min / max
  });

  it('renders distribution bucket labels and counts with legend items', () => {
    render(<CalibrationDistributionChart distribution={mockDistribution} />);

    expect(screen.getByText('80-89 (Vượt kỳ vọng)')).toBeInTheDocument();
    expect(screen.getByText('6 (50%)')).toBeInTheDocument();
  });

  it('handles zero evaluation state without crashing', () => {
    const emptyDist: CalibrationDistribution = {
      totalEvaluations: 0,
      averageScore: 0,
      medianScore: 0,
      minScore: 0,
      maxScore: 0,
      buckets: [
        { range: '0-59 (Chưa đạt)', count: 0, percentage: 0 },
        { range: '60-69 (Cần cải thiện)', count: 0, percentage: 0 },
        { range: '70-79 (Đạt yêu cầu)', count: 0, percentage: 0 },
        { range: '80-89 (Vượt kỳ vọng)', count: 0, percentage: 0 },
        { range: '90-100 (Xuất sắc)', count: 0, percentage: 0 },
      ],
    };

    render(<CalibrationDistributionChart distribution={emptyDist} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText('0.00').length).toBeGreaterThanOrEqual(1);
  });
});

describe('CalibrationAdjustmentModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  const mockEvaluation: import('../types/calibration-types').CalibrationEvaluationRow = {
    evaluationId: 'eval-1',
    employeeId: 'emp-1',
    employeeName: 'Nguyễn Văn A',
    employeeCode: 'EMP-001',
    departmentName: 'Kỹ thuật',
    teamName: 'Nền tảng',
    calculatedScore: 78.5,
    finalScore: 80.0,
    status: 'CALIBRATION',
    isLocked: false,
    latestAdjustmentReason: null,
    latestAdjustedAt: null,
    latestAdjustedByName: null,
  };

  it('renders initial score information and audit reminder notice', () => {
    render(
      <CalibrationAdjustmentModal
        isOpen={true}
        evaluation={mockEvaluation}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />
    );

    expect(screen.getByText('Hiệu chuẩn điểm đánh giá')).toBeInTheDocument();
    expect(screen.getByText(/Nguyễn Văn A/i)).toBeInTheDocument();
    expect(screen.getByText(/EMP-001/i)).toBeInTheDocument();
    expect(screen.getByText('78.50')).toBeInTheDocument(); // calculated
    expect(screen.getByText('80.00')).toBeInTheDocument(); // current final
    expect(screen.getByText(/nhật ký kiểm toán \(audit log\)/i)).toBeInTheDocument();
  });

  it('validates score range [0, 100]', () => {
    render(
      <CalibrationAdjustmentModal
        isOpen={true}
        evaluation={mockEvaluation}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />
    );

    const scoreInput = screen.getByLabelText(/Điểm hiệu chuẩn mới/i);
    fireEvent.change(scoreInput, { target: { value: '105' } });

    const reasonInput = screen.getByLabelText(/Lý do điều chỉnh/i);
    fireEvent.change(reasonInput, { target: { value: 'Demonstrated outstanding cross-functional leadership' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu hiệu chuẩn/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('Điểm số hiệu chuẩn phải là số hợp lệ từ 0 đến 100.')).toBeInTheDocument();
  });

  it('requires a non-empty adjustment reason with minimum 3 characters', () => {
    render(
      <CalibrationAdjustmentModal
        isOpen={true}
        evaluation={mockEvaluation}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />
    );

    const scoreInput = screen.getByLabelText(/Điểm hiệu chuẩn mới/i);
    fireEvent.change(scoreInput, { target: { value: '88' } });

    const reasonInput = screen.getByLabelText(/Lý do điều chỉnh/i);
    fireEvent.change(reasonInput, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu hiệu chuẩn/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('Lý do điều chỉnh điểm là bắt buộc (tối thiểu 3 ký tự) để phục vụ kiểm toán.')).toBeInTheDocument();
  });

  it('calls onSubmit with sanitized data when form is valid', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <CalibrationAdjustmentModal
        isOpen={true}
        evaluation={mockEvaluation}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        isPending={false}
      />
    );

    const scoreInput = screen.getByLabelText(/Điểm hiệu chuẩn mới/i);
    fireEvent.change(scoreInput, { target: { value: '85.5' } });

    const reasonInput = screen.getByLabelText(/Lý do điều chỉnh/i);
    fireEvent.change(reasonInput, { target: { value: 'Cống hiến nổi bật trong dự án Q3' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu hiệu chuẩn/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(handleSubmit).toHaveBeenCalledWith('eval-1', 85.5, 'Cống hiến nổi bật trong dự án Q3');
  });
});

describe('CreateSessionModal Component', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  afterEach(() => {
    cleanup();
  });

  it('renders scope selector and cycle name', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateSessionModal
          isOpen={true}
          cycleId="cycle-1"
          cycleName="Đánh giá hiệu suất năm 2026"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          isPending={false}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText('Tạo phiên hiệu chuẩn mới')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Đánh giá hiệu suất năm 2026')).toBeInTheDocument();
    expect(screen.getByText('Toàn công ty (Org-wide)')).toBeInTheDocument();
  });

  it('shows department selector when DEPARTMENT scope is chosen', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateSessionModal
          isOpen={true}
          cycleId="cycle-1"
          cycleName="Đánh giá hiệu suất năm 2026"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          isPending={false}
        />
      </QueryClientProvider>
    );

    const scopeSelect = screen.getByRole('combobox');
    fireEvent.change(scopeSelect, { target: { value: 'DEPARTMENT' } });

    expect(screen.getByRole('option', { name: /Kỹ thuật \(ENG\)/i })).toBeInTheDocument();
  });

  it('submits ORG session correctly without scopeId', () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <QueryClientProvider client={queryClient}>
        <CreateSessionModal
          isOpen={true}
          cycleId="cycle-1"
          cycleName="Đánh giá hiệu suất năm 2026"
          onClose={vi.fn()}
          onSubmit={handleSubmit}
          isPending={false}
        />
      </QueryClientProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Tạo phiên hiệu chuẩn/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith({
      evaluation_cycle_id: 'cycle-1',
      scope_type: 'ORG',
      scope_id: null,
    });
  });
});
