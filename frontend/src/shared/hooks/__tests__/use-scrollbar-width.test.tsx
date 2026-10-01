/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { useScrollbarWidth } from '../use-scrollbar-width';

const Probe = () => {
  const [ref, width] = useScrollbarWidth<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="box">
      <span data-testid="width">{width}</span>
    </div>
  );
};

describe('useScrollbarWidth', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns offsetWidth minus clientWidth', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(210);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);

    render(<Probe />);

    expect(screen.getByTestId('width')).toHaveTextContent('10');
  });

  it('works without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);

    expect(() => render(<Probe />)).not.toThrow();
    expect(screen.getByTestId('width')).toHaveTextContent('0');
  });
});
