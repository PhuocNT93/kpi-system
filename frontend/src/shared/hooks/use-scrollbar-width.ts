import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

// Measures the vertical scrollbar width of a scroll container (varies by OS/browser)
// and keeps it current when the element resizes.
export function useScrollbarWidth<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.offsetWidth - element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
