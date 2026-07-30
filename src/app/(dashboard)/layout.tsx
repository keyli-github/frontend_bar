'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useAuthStore } from '@/store/auth-store';
import { canAccess } from '@/lib/roles';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { BoneAppShell } from '@/components/shared/bones';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const permisos = useAuthStore((s) => s.permisos);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const router = useRouter();
  const pathname = usePathname();
  const boneyardBuild = useBoneyardBuild();

  // Restaura la sesion canjeando el refresh token persistido. Es idempotente,
  // asi que navegar entre rutas del dashboard no dispara peticiones extra.
  useEffect(() => {
    if (boneyardBuild) return;
    void bootstrap();
  }, [bootstrap, boneyardBuild]);

  useEffect(() => {
    if (boneyardBuild) return;
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status !== 'authenticated') return;

    // El backend bloquea toda la API hasta que se renueve la contrasena.
    if (mustChangePassword) {
      router.replace('/cambiar-password');
      return;
    }

    // Defensa en profundidad: si el usuario teclea una URL para la que su rol
    // no tiene permiso, lo devolvemos al dashboard. El backend responderia 403
    // igualmente, pero asi evitamos pintar una pantalla vacia de errores.
    if (!canAccess(permisos, pathname)) {
      router.replace('/no-autorizado');
    }
  }, [status, mustChangePassword, permisos, pathname, router, boneyardBuild]);

  // Silueta del armazon mientras se restaura la sesion: sin este paso se veia
  // un spinner a pantalla completa y luego un salto brusco a la app entera.
  if (!boneyardBuild && (status === 'idle' || status === 'loading')) {
    return <BoneAppShell />;
  }

  if (
    (!boneyardBuild && status !== 'authenticated') ||
    mustChangePassword ||
    (!boneyardBuild && !canAccess(permisos, pathname))
  ) {
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          id="contenido"
          tabIndex={-1}
          /* pb-20 deja hueco al bottom-nav movil; lg:pb-0 lo recupera en escritorio */
          className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0"
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
