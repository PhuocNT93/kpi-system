/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import type React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EvaluationPickerList, type EvaluationPickerItem } from '../components/EvaluationPickerList';

const ITEMS: EvaluationPickerItem[] = [
  { id: 'eval-1', title: 'Chung Quang Phương', subtitle: '247423 • Employee • 2026 H2', status: 'OPEN' },
  { id: 'eval-2', title: 'Hà Việt Tùng', subtitle: '213866 • Employee • 2026 H2', status: 'SUBMITTED' },
  { id: 'eval-3', title: 'Lê Minh Hy', subtitle: '213844 • Employee • 2026 H2', status: 'LOCKED' },
];

const renderList = (overrides: Partial<React.ComponentProps<typeof EvaluationPickerList>> = {}) => {
  const props: React.ComponentProps<typeof EvaluationPickerList> = {
    items: ITEMS,
    activeId: 'eval-2',
    searchValue: '',
    searchPlaceholder: 'Search',
    emptyLabel: 'No evaluations found.',
    onSearchChange: vi.fn(),
    onSelect: vi.fn(),
    ...overrides,
  };
  render(<EvaluationPickerList {...props} />);
  return props;
};

describe('EvaluationPickerList', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a card with title, subtitle and status for every item', () => {
    renderList();

    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(3);
    expect(screen.getByText('Chung Quang Phương')).toBeInTheDocument();
    expect(screen.getByText('213866 • Employee • 2026 H2')).toBeInTheDocument();
    expect(screen.getByText('LOCKED')).toBeInTheDocument();
  });

  it('marks only the active card as pressed', () => {
    renderList();

    const cards = screen.getAllByRole('button');
    expect(cards.map((card) => card.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
  });

  it('calls onSelect with the clicked card id', () => {
    const props = renderList();

    fireEvent.click(screen.getByText('Lê Minh Hy'));

    expect(props.onSelect).toHaveBeenCalledTimes(1);
    expect(props.onSelect).toHaveBeenCalledWith('eval-3');
  });

  it('forwards search input changes', () => {
    const props = renderList();

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'hà' } });

    expect(props.onSearchChange).toHaveBeenCalledWith('hà');
  });

  it('shows the empty label and no cards when there are no items', () => {
    renderList({ items: [] });

    expect(screen.getByText('No evaluations found.')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('hides the vertical scrollbar on the list region', () => {
    renderList();

    expect(screen.getByTestId('evaluation-picker-scroll')).toHaveClass('no-scrollbar');
  });
});
