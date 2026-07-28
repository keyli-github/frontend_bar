'use client';

import { useLayoutEffect } from 'react';
import { useThemeStore } from '@/store/theme-store';

/**
 * Cambia el tema de forma INSTANTÁNEA sin transiciones/parpadeo.
 * 1. Añade class .changing-theme → desactiva transitions via CSS
 * 2. Cambia dark/light class
 * 3. Reflow forzado
 * 4. Quita .changing-theme → transitions vuelven a funcionar
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useLayoutEffect(() => {
    const root = document.documentElement;

    // Bloquea transiciones
    root.classList.add('changing-theme');

    // Aplica tema
    root.style.colorScheme = theme;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Fuerza reflow para que se pinte inmediatamente
    void root.offsetHeight;

    // Re-habilita transiciones al siguiente frame
    requestAnimationFrame(() => {
      root.classList.remove('changing-theme');
    });
  }, [theme]);

  return <>{children}</>;
}
