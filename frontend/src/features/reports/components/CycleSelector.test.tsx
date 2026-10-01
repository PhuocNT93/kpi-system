/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CycleSelector } from './CycleSelector';
import * as cycleApi from '../../evaluation-cycles/api/cycle-api';
import type { EvaluationCycleDTO } from '../../evaluation-cycles/types/cycle-types';

vi.mock('../../evaluation-cycles/api/cycle-api', () => ({
  evaluationCycleApi: { getCycles: vi.fn() },
}));

describe('CycleSelector', () => {
  beforeEach(() => {
    vi.mocked(cycleApi.evaluationCycleApi.getCycles).mockResolvedValue([
      { id: 'cycle-1', name: '2026 Q2', code: 'Q2', status: 'OPEN' } as unknown as EvaluationCycleDTO,
    ]);
  });

  const renderSelector = (props: Partial<React.ComponentProps<typeof CycleSelector>>, onChange = vi.fn()) => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <CycleSelector value="" onChange={onChange} label="Cycle" {...props} />
      </QueryClientProvider>
    );
    return onChange;
  };

  it('auto-selects the first cycle by default', async () => {
    const onChange = renderSelector({});
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('cycle-1'));
  });

  it('stays empty with a "No comparison" option when optional', async () => {
    const onChange = renderSelector({ isOptional: true });

    expect(await screen.findByRole('option', { name: /2026 Q2/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'No comparison' })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
