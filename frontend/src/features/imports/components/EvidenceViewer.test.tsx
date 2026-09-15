/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EvidenceViewer } from './EvidenceViewer';
import type { FinalEvidenceItem } from '@/features/reports/types/reports.types';

describe('EvidenceViewer', () => {
  it('renders empty message when no evidence items provided', () => {
    render(<EvidenceViewer evidences={[]} emptyMessage="Custom empty message" />);
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('renders active evidence item with URL and type badge', () => {
    const items: FinalEvidenceItem[] = [
      {
        id: 'ev-1',
        title: 'Jira Sprint Report',
        type: 'URL',
        url: 'https://jira.company.com/report/1',
        description: 'Sprint delivery data',
        status: 'ACTIVE',
        createdAt: '2026-09-14T00:00:00.000Z',
      },
    ];

    render(<EvidenceViewer evidences={items} />);

    expect(screen.getByText('Jira Sprint Report')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Sprint delivery data')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Link/i })).toHaveAttribute(
      'href',
      'https://jira.company.com/report/1'
    );
  });

  it('renders superseded evidence with warning banner and reason', () => {
    const items: FinalEvidenceItem[] = [
      {
        id: 'ev-2',
        title: 'Old Velocity Metric',
        type: 'DOCUMENT',
        status: 'SUPERSEDED',
        supersededBy: 'ev-3',
        supersededAt: '2026-09-14T10:00:00.000Z',
        supersedeReason: 'Updated with final sprint close numbers',
        createdAt: '2026-09-13T00:00:00.000Z',
      },
    ];

    render(<EvidenceViewer evidences={items} />);

    expect(screen.getByText('Old Velocity Metric')).toBeInTheDocument();
    expect(screen.getByText('SUPERSEDED')).toBeInTheDocument();
    expect(screen.getByText(/Updated with final sprint close numbers/i)).toBeInTheDocument();
    expect(screen.getByText(/by evidence: ev-3/i)).toBeInTheDocument();
  });
});
