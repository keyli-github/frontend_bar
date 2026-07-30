import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Página no encontrada | Bar beer',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-6 py-16">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/3 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl"
      />

      <section className="relative w-full max-w-lg text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary-text">
          <FileQuestion size={30} aria-hidden="true" />
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-primary-text">
          Error 404
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Página no encontrada
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          La dirección solicitada no existe o pertenece a un módulo que todavía
          no está disponible.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Volver al dashboard
        </Link>
      </section>
    </main>
  );
}
