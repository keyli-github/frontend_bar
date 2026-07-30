'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function RootPage() {
  const status = useAuthStore((s) => s.status);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const router = useRouter();

  // Intenta restaurar la sesion antes de decidir el destino, para no mandar al
  // login a alguien que tiene un refresh token valido.
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === 'idle' || status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    router.replace(mustChangePassword ? '/cambiar-password' : '/dashboard');
  }, [status, mustChangePassword, router]);

  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background"
      role="status"
      aria-label="Redirigiendo"
    >
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
