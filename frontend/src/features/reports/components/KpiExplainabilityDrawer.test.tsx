/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KpiExplainabilityDrawer } from './KpiExplainabilityDrawer';
import * as reportsApi from '../api/reports.api';
import type { ExplainabilityViewDto } from '../types/reports.types';

vi.mock('../api/reports.api', () => ({
  fetchKpiEvidence: vi.fn(),
}));

describe('KpiExplainabilityDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <KpiExplainabilityDrawer
        isOpen={false}
        onClose={vi.fn()}
        evaluationId="eval-1"
        kpiCode="KPI_01"
      />
    );
    expect(screen.queryByText(/KPI Explainability/i)).not.toBeInTheDocument();
  });

  it('renders loading state and then populates calculation lineage and evidence', async () => {
    const mockDto: ExplainabilityViewDto = {
      evaluationId: 'eval-1',
      evaluationItemId: 'item-1',
      kpiCode: 'KPI_SPEED',
      score: 95.0,
      measurement: 42,
      rationale: 'Calculated from automated sprint completions',
      comment: 'Top tier execution',
      source: {
        sourceType: 'JIRA',
        sourceName: 'Jira Software Cloud',
        sourceReference: 'BOARD-1',
        collectedAt: '2026-09-14T00:00:00.000Z',
      },
      import: {
        id: 'imp-100',
        createdAt: '2026-09-14T01:00:00.000Z',
        createdBy: 'hr.admin@company.com',
      },
      evidences: [
        {
          id: 'ev-10',
          title: 'Sprint burndown snapshot',
          type: 'URL',
          url: 'https://jira.company.com',
          status: 'ACTIVE',
          createdAt: '2026-09-14T00:00:00.000Z',
        },
      ],
    };

    vi.mocked(reportsApi.fetchKpiEvidence).mockResolvedValue(mockDto);

    const onClose = vi.fn();
    render(
      <KpiExplainabilityDrawer
        isOpen={true}
        onClose={onClose}
        evaluationId="eval-1"
        kpiCode="KPI_SPEED"
        kpiName="Delivery Speed"
      />
    );

    expect(screen.getByText(/Fetching KPI calculation lineage/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('95.0')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Calculated from automated sprint completions')).toBeInTheDocument();
      expect(screen.getByText('Top tier execution')).toBeInTheDocument();
      expect(screen.getByText('Jira Software Cloud')).toBeInTheDocument();
      expect(screen.getByText(/imp-100/i)).toBeInTheDocument();
      expect(screen.getByText('Sprint burndown snapshot')).toBeInTheDocument();
    });

    // Close button
    const closeBtn = screen.getByRole('button', { name: /Close/i });
    const user = userEvent.setup();
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders error alert when API call fails', async () => {
    vi.mocked(reportsApi.fetchKpiEvidence).mockRejectedValue(new Error('Evaluation not found'));

    render(
      <KpiExplainabilityDrawer
        isOpen={true}
        onClose={vi.fn()}
        evaluationId="eval-999"
        kpiCode="KPI_01"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Evaluation not found')).toBeInTheDocument();
    });
  });
});
