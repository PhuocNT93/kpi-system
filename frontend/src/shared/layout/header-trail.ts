import { createContext, useContext, useEffect } from 'react';

// Lets a hub page tell the app header which tab is open. While a trail is set, the header shows
// a small "Section › Tab" breadcrumb instead of repeating the title the hub banner already shows.
export const HeaderTrailValueContext = createContext<string | null>(null);
export const HeaderTrailSetterContext = createContext<((trail: string | null) => void) | null>(null);

export function useHeaderTrailValue(): string | null {
  return useContext(HeaderTrailValueContext);
}

export function useHeaderTrail(label: string): void {
  const setTrail = useContext(HeaderTrailSetterContext);
  useEffect(() => {
    if (!setTrail) return;
    setTrail(label);
    return () => setTrail(null);
  }, [setTrail, label]);
}
