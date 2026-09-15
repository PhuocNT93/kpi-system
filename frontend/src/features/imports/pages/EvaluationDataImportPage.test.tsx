/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EvaluationDataImportPage } from './EvaluationDataImportPage';
import * as importApi from '../api/evaluation-data-import-api';
import * as authContext from '@/shared/auth/auth-context';
import type { AuthUser } from '@/shared/auth/auth-models';
import type {
  EvaluationDataImport,
  ImportPreviewResponse,
} from '../api/evaluation-data-import.types';

vi.mock('../api/evaluation-data-import-api', () => ({
  createEvaluationDataImport: vi.fn(),
  listEvaluationDataImports: vi.fn(),
  getEvaluationDataImportPreview: vi.fn(),
  patchEvaluationDataImportRecord: vi.fn(),
  applyEvaluationDataImport: vi.fn(),
}));

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockImport: EvaluationDataImport = {
  import_id: 'imp-123',
  source_system: 'Jira Software',
  batch_reference: 'BATCH-1',
  status: 'READY',
  record_count: 1,
  success_count: 1,
  error_count: 0,
  conflict_count: 0,
  created_by: 'hr-user',
  created_at: '2026-09-14T00:00:00.000Z',
  updated_at: '2026-09-14T00:00:00.000Z',
  raw_payload: {
    source_system: 'Jira Software',
    records: [],
  },
};

const mockPreview: ImportPreviewResponse = {
  import: mockImport,
  records: [
    {
      record_id: 'rec-1',
      import_id: 'imp-123',
      employee_code: 'EMP001',
      cycle_id: 'cycle-1',
      kpi_code: 'KPI_SPEED',
      value: 95.5,
      rationale: 'Velocity sprint calculation',
      comment: 'Top deliverable',
      source_snapshot: {
        source_type: 'JIRA',
        source_name: 'Jira Software',
        collected_at: '2026-09-14T00:00:00.000Z',
      },
      status: 'VALID',
      created_at: '2026-09-14T00:00:00.000Z',
      updated_at: '2026-09-14T00:00:00.000Z',
      evidences: [],
    },
  ],
  summary: {
    total_records: 1,
    valid_records: 1,
    conflict_records: 0,
    invalid_records: 0,
  },
};

describe('EvaluationDataImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: 'hr-1', role: 'HR_ADMIN', name: 'HR Admin' } as unknown as AuthUser,
      isAuthenticated: true,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(importApi.listEvaluationDataImports).mockResolvedValue({
      items: [mockImport],
      total: 1,
      page: 1,
      limit: 50,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders forbidden state when user has no admin role', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: 'emp-1', role: 'EMPLOYEE', name: 'Employee' } as unknown as AuthUser,
      isAuthenticated: true,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    render(<EvaluationDataImportPage />);
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
  });

  it('submits payload and moves to preview tab', async () => {
    vi.mocked(importApi.createEvaluationDataImport).mockResolvedValue(mockImport);
    vi.mocked(importApi.getEvaluationDataImportPreview).mockResolvedValue(mockPreview);

    render(<EvaluationDataImportPage />);

    expect(screen.getByText('KPI Data Import')).toBeInTheDocument();
    expect(screen.getByText('Stage Payload')).toBeInTheDocument();

    const stageBtn = screen.getByRole('button', { name: /Stage & Validate Import/i });
    const user = userEvent.setup();
    await user.click(stageBtn);

    expect(importApi.createEvaluationDataImport).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('EMP001')).toBeInTheDocument();
      expect(screen.getByText('KPI_SPEED')).toBeInTheDocument();
      expect(screen.getByText('95.5')).toBeInTheDocument();
      expect(screen.getByText('Velocity sprint calculation')).toBeInTheDocument();
    });
  });

  it('handles apply confirmation dialog flow', async () => {
    vi.mocked(importApi.getEvaluationDataImportPreview).mockResolvedValue(mockPreview);
    vi.mocked(importApi.applyEvaluationDataImport).mockResolvedValue({
      import_id: 'imp-123',
      status: 'APPLIED',
      applied_count: 1,
      conflict_count: 0,
      error_count: 0,
    });

    render(<EvaluationDataImportPage />);

    // Click history and select import
    const historyTab = screen.getByRole('button', { name: /Import History/i });
    const user = userEvent.setup();
    await user.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('View Preview')).toBeInTheDocument();
    });

    const viewPreviewBtn = screen.getByText('View Preview');
    await user.click(viewPreviewBtn);

    await waitFor(() => {
      expect(screen.getByText('Apply to KPI Evaluations')).toBeInTheDocument();
    });

    const applyBtn = screen.getByRole('button', { name: /Apply to KPI Evaluations/i });
    await user.click(applyBtn);

    // Dialog opens
    expect(screen.getByText('Confirm KPI Data Import Apply')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Apply Batch/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(importApi.applyEvaluationDataImport).toHaveBeenCalledWith('imp-123');
      expect(screen.getByText(/Batch Apply Completed with status: APPLIED/i)).toBeInTheDocument();
    });
  });
});
