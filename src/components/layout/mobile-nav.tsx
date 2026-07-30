'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { MOBILE_NAV } from '@/lib/navigation';
import { canAccess } from '@/lib/roles';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

/**
 * Barra de navegacion inferior — solo en <lg.
 *
 * En movil el sidebar es un cajon que hay que abrir para cada salto de
 * seccion. Esta barra deja los cuatro destinos mas usados a un toque, con
 * targets de 44px y respetando el area segura de iOS.
 */
export function MobileNav() {
  const pathname = usePathname();
  const permisos = useAuthStore((s) => s.permisos);
  const openSidebar = useUIStore((s) => s.toggleSidebar);

  const items = MOBILE_NAV.filter((item) => canAccess(permisos, item.href));
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background/95 backdrop-blur lg:hidden"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-2 text-[10px] font-medium transition-colors',
              active ? 'text-primary-text' : 'text-muted-foreground',
            )}
          >
            <item.icon size={20} aria-hidden="true" />
            <span className="max-w-full truncate">{item.name}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={openSidebar}
        aria-label="Abrir menú completo"
        className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-2 text-[10px] font-medium text-muted-foreground transition-colors"
      >
        <Menu size={20} aria-hidden="true" />
        <span>Más</span>
      </button>
    </nav>
  );
}
