'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Evalua una media query desde JS.
 *
 * Hace falta cuando una decision NO se puede expresar en CSS: por ejemplo
 * `inert`, que es un atributo del DOM y no una propiedad de estilo. El sidebar
 * debe ser inerte en movil mientras el cajon esta cerrado, pero navegable
 * siempre en escritorio.
 *
 * Usa `useSyncExternalStore` en lugar de `useState` + `useEffect` para evitar
 * el render en cascada que React 19 marca como error
 * (`react-hooks/set-state-in-effect`). En servidor devuelve `false`, y React
 * resuelve la diferencia durante la hidratacion.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Punto de ruptura `lg` de Tailwind, donde el sidebar deja de ser un cajon. */
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1024px)');
