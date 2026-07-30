import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ShieldX } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Acceso no autorizado | Bar beer',
  robots: { index: false, follow: false },
};

export default function NoAutorizadoPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-6 py-16">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/3 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/5 blur-3xl"
      />

      <section className="relative w-full max-w-lg text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-destructive/25 bg-destructive/10 text-destructive">
          <ShieldX size={30} aria-hidden="true" />
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-destructive">
          Error 403
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Acceso no autorizado
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Tu cuenta está activa, pero no tiene permiso para abrir este módulo.
          Si necesitas acceso, solicita el permiso a un administrador.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ArrowLeft size={15} aria-hidden="true" /> Volver al dashboard
          </Link>
          <Link
            href="/perfil"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ver mi cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}
