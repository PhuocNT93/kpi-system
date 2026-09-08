/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ImportUploadPage } from './ImportUploadPage';
import * as csvTemplateApi from '../api/csv-template-api';
import type { CsvTemplate } from '../api/csv-template-types';
import { ApiClientError } from '@/shared/api/api-client';

vi.mock('../api/csv-template-api', () => ({
  getCurrentCsvTemplate: vi.fn(),
  downloadCurrentCsvTemplate: vi.fn(),
}));

const mockTemplate: CsvTemplate = {
  csvTemplateId: 'test-id',
  code: 'EVALUATION_SCORE_IMPORT',
  versionNo: 1,
  status: 'ACTIVE',
  effectiveFrom: '2024-01-01T00:00:00.000Z',
  columns: [
    {
      csvTemplateColumnId: 'col1',
      columnName: 'employee_id',
      dataType: 'string',
      required: true,
      validationRule: null,
      displayOrder: 1,
    },
    {
      csvTemplateColumnId: 'col2',
      columnName: 'kpi_code',
      dataType: 'string',
      required: false,
      validationRule: null,
      displayOrder: 2,
    },
    {
      csvTemplateColumnId: 'col3',
      columnName: 'measurement_value',
      dataType: 'decimal',
      required: true,
      validationRule: { type: 'decimal', min: 0, max: 100 },
      displayOrder: 3,
    }
  ]
};

describe('ImportUploadPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <ImportUploadPage />
      </QueryClientProvider>
    );
  }

  it('renders loading state initially', () => {
    vi.mocked(csvTemplateApi.getCurrentCsvTemplate).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading CSV templates...');
  });

  it('renders template details and columns', async () => {
    vi.mocked(csvTemplateApi.getCurrentCsvTemplate).mockResolvedValue(mockTemplate);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('EVALUATION_SCORE_IMPORT')).toBeInTheDocument();
    });

    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    
    // Check required rendering
    const employeeRow = screen.getByText('employee_id').closest('tr');
    expect(employeeRow).toHaveTextContent('Yes');
    
    // Check optional kpi_code rendering
    const kpiRow = screen.getByText('kpi_code').closest('tr');
    expect(kpiRow).toHaveTextContent('Optional');
    
    // Check validation rule translation
    const valueRow = screen.getByText('measurement_value').closest('tr');
    expect(valueRow).toHaveTextContent('Type: decimal, Range: 0 – 100');
  });

  it('triggers download on button click', async () => {
    vi.mocked(csvTemplateApi.getCurrentCsvTemplate).mockResolvedValue(mockTemplate);
    vi.mocked(csvTemplateApi.downloadCurrentCsvTemplate).mockResolvedValue({
      blob: new Blob(['test'], { type: 'text/csv' }),
      filename: 'test.csv'
    });

    // Mock URL methods
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    global.URL.revokeObjectURL = vi.fn();

    renderPage();

    const btn = await screen.findByRole('button', { name: /Download CSV Template/i });
    
    const user = userEvent.setup();
    await user.click(btn);

    expect(csvTemplateApi.downloadCurrentCsvTemplate).toHaveBeenCalledTimes(1);
    
    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('renders 403 error gracefully', async () => {
    vi.mocked(csvTemplateApi.getCurrentCsvTemplate).mockRejectedValue(
      new ApiClientError('Permission denied', 'FORBIDDEN', 'req-1', 403)
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Permission denied');
    });
    
    // Ensure template structure isn't shown
    expect(screen.queryByText('Template Details')).not.toBeInTheDocument();
  });
});
