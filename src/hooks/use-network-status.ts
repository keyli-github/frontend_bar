'use client';

/**
 * Detecta conectividad de red de forma reactiva.
 * - SSR-safe: initialState = true (asumir online en servidor).
 * - Se actualiza con los eventos nativos `online` / `offline`.
 */
import { useEffect, useState } from 'react';

export function useNetworkStatus(): boolean {
  // Inicializador lazy: en el cliente usa `navigator.onLine` en la primera
  // evaluación (ya es client-side); en SSR cae a `true` por defecto.
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
