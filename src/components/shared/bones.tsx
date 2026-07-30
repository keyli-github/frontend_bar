'use client';

/**
 * Skeletons granulares.
 *
 * Cada region de datos se envuelve en `<Bones>`, no la pagina entera: la
 * cabecera aparece de inmediato y solo el bloque que espera al API muestra
 * huesos.
 *
 * Regla del proyecto: durante una carga NUNCA se pinta texto ("Cargando…").
 * `<Bones>` lo garantiza porque el `placeholder` cumple dos funciones:
 *   1. Es el respaldo CSS cuando todavia no existe `.bones.json` capturado
 *      (proyecto recien clonado, antes de `npm run bones`).
 *   2. Ocupa el alto real del bloque mientras Boneyard superpone los huesos
 *      pixel-perfect; sin contenido debajo, el overlay se colapsaria a 0px.
 */
import type { ReactNode } from 'react';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { cn } from '@/lib/utils';

/** Bloque individual con animacion de pulso. */
export function Bone({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-muted', className)} />
  );
}

export function Bones({
  name,
  loading,
  placeholder,
  children,
  className,
}: {
  /** Debe coincidir con el nombre capturado en `src/bones/`. */
  name: string;
  loading: boolean;
  placeholder: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <BoneyardSkeleton
      name={name}
      loading={loading}
      /* Los huesos se capturan por ancho de viewport, no de contenedor. */
      select="viewport"
      transition={200}
      className={className}
      fallback={placeholder}
    >
      {loading ? placeholder : children}
    </BoneyardSkeleton>
  );
}

// ============================================================
// PLACEHOLDERS POR FORMA DE BLOQUE
// ============================================================

/** Rejilla de tarjetas KPI. */
export function BoneKpis({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface px-4 py-3">
          <div className="flex items-center justify-between">
            <Bone className="h-2.5 w-20" />
            <Bone className="size-3.5 rounded" />
          </div>
          <Bone className="mt-2 h-5 w-10" />
        </div>
      ))}
    </div>
  );
}

/** Tabla con cabecera y filas. Sustituye al contenedor con scroll. */
export function BoneTable({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="w-full">
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Bone key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="flex flex-1 items-center gap-3">
              {c === 0 && <Bone className="size-8 shrink-0 rounded-full" />}
              <Bone className={cn('h-3', c === 0 ? 'w-24' : 'w-full max-w-28')} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Rejilla de tarjetas (roles, sedes). */
export function BoneCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Bone className="size-4 shrink-0" />
              <Bone className="h-4 w-32" />
            </div>
            <Bone className="h-4 w-16 rounded" />
          </div>
          <Bone className="h-3 w-full" />
          <div className="flex gap-4">
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-16" />
            <Bone className="h-3 w-16" />
          </div>
          <div className="flex gap-2 pt-1">
            <Bone className="h-7 w-20 rounded-lg" />
            <Bone className="h-7 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Lista vertical con separadores (sedes, actividad, sesiones). */
export function BoneList({
  rows = 5,
  avatar = false,
}: {
  rows?: number;
  avatar?: boolean;
}) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          {avatar && <Bone className="size-4 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bone className="h-3 w-2/5" />
            <Bone className="h-2.5 w-3/5" />
          </div>
          <Bone className="h-3 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Barras de progreso etiquetadas (usuarios por rol). */
export function BoneBars({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between">
            <Bone className="h-3 w-24" />
            <Bone className="h-3 w-6" />
          </div>
          <Bone className="h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Silueta del layout completo mientras se restaura la sesion.
 *
 * En esa fase todavia no se sabe si hay sesion ni que permisos trae el JWT,
 * asi que no se puede pintar el sidebar real. Un esqueleto del armazon evita
 * el salto brusco de "pantalla vacia" a "aplicacion completa".
 */
export function BoneAppShell() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background" role="status" aria-label="Cargando sesión">
      <aside className="hidden w-[17rem] shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Bone className="h-8 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Bone key={i} className="h-9 w-full" />
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3">
          <Bone className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Bone className="h-3 w-24" />
            <Bone className="h-2.5 w-16" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4 lg:px-6">
          <Bone className="h-4 w-32" />
          <div className="ml-auto flex items-center gap-2">
            <Bone className="h-8 w-28 rounded-lg" />
            <Bone className="size-8 rounded-lg" />
            <Bone className="size-8 rounded-full" />
          </div>
        </header>

        <main className="flex-1 space-y-5 overflow-hidden p-4 lg:p-6">
          <div className="space-y-2">
            <Bone className="h-6 w-48" />
            <Bone className="h-3 w-32" />
          </div>
          <BoneKpis count={4} />
          <BoneCards count={3} />
        </main>
      </div>
    </div>
  );
}

/** Catalogo agrupado por modulo (permisos). */
export function BoneCatalogo({
  groups = 3,
  items = 4,
}: {
  groups?: number;
  items?: number;
}) {
  return (
    <div className="space-y-5">
      {Array.from({ length: groups }, (_, g) => (
        <div key={g} className="surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bone className="size-4" />
            <Bone className="h-3 w-28" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: items }, (_, i) => (
              <div key={i} className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                <Bone className="h-3 w-32" />
                <Bone className="h-2.5 w-full" />
                <Bone className="h-2 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
