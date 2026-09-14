/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { KpiTrendTable } from './KpiTrendTable';

describe('KpiTrendTable', () => {
  it('renders trends correctly', () => {
    const mockTrends = [
      { kpiCode: 'KPI01', kpiName: 'KPI 1', status: 'MATCHED' as const, previousScore: 8, currentScore: 9, delta: 1 },
      { kpiCode: 'KPI02', kpiName: 'KPI 2', status: 'NEW' as const, currentScore: 8.5 },
      { kpiCode: 'KPI03', kpiName: 'KPI 3', status: 'REMOVED' as const, previousScore: 7 },
    ];

    render(<KpiTrendTable trends={mockTrends} />);
    
    expect(screen.getByText('KPI01')).toBeInTheDocument();
    expect(screen.getByText('MATCHED')).toBeInTheDocument();
    expect(screen.getByText('+1.0')).toBeInTheDocument();

    expect(screen.getByText('KPI02')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();

    expect(screen.getByText('KPI03')).toBeInTheDocument();
    expect(screen.getByText('REMOVED')).toBeInTheDocument();
  });

  it('renders empty state when no trends provided', () => {
    render(<KpiTrendTable trends={[]} />);
    
    expect(screen.getByText('No KPI trend data available.')).toBeInTheDocument();
  });
});
