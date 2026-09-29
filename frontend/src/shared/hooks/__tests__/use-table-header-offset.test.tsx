/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TABLE_HEADER_HEIGHT_VAR, useTableHeaderOffset } from '../use-table-header-offset';

function Frame({ hasHeader }: { hasHeader: boolean }) {
  const ref = useTableHeaderOffset<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="frame">
      <table>
        {hasHeader && (
          <thead>
            <tr>
              <th>Name</th>
            </tr>
          </thead>
        )}
        <tbody>
          <tr>
            <td>Row</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

describe('useTableHeaderOffset', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('publishes the header height so the scrollbar starts below the header', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 44.4 } as DOMRect);

    const { getByTestId } = render(<Frame hasHeader />);

    expect(getByTestId('frame').style.getPropertyValue(TABLE_HEADER_HEIGHT_VAR)).toBe('44px');
  });

  it('uses no offset when the frame has no table header', () => {
    const { getByTestId } = render(<Frame hasHeader={false} />);

    expect(getByTestId('frame').style.getPropertyValue(TABLE_HEADER_HEIGHT_VAR)).toBe('0px');
  });
});
