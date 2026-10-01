import { useCallback, useRef } from 'react';

export const TABLE_HEADER_HEIGHT_VAR = '--table-header-height';

// Callback ref for a `.table-scroll-frame`: publishes the height of its sticky `thead` as a CSS
// variable, which pushes the vertical scrollbar track below the header (see index.css).
// Written straight to the element so a header resize never re-renders the table.
export function useTableHeaderOffset<T extends HTMLElement>(): (element: T | null) => void {
  const observerRef = useRef<ResizeObserver | null>(null);

  return useCallback((element: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!element) return;

    const measure = () => {
      const header = element.querySelector('thead');
      const height = header ? header.getBoundingClientRect().height : 0;
      element.style.setProperty(TABLE_HEADER_HEIGHT_VAR, `${Math.round(height)}px`);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const header = element.querySelector('thead');
    if (header) observer.observe(header);
    observerRef.current = observer;
  }, []);
}
