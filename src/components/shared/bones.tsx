'use client';

/**
 * Sistema de estados de carga con umbrales progresivos.
 *
 * Fases de carga en `<Bones>`:
 *   0 – 180 ms  → sin indicador visual (operaciones rápidas pasan inadvertidas)
 *   180 ms – 3 s → esqueleto estático (sin animación de pulso)
 *   3 s – 10 s   → esqueleto + advertencia discreta "tardando más de lo esperado"
 *   > 10 s       → estado de tiempo agotado con botón "Reintentar"
 *
 * Por qué este enfoque:
 *   Si la API responde en <180 ms el usuario no ve ningún parpadeo porque el
 *   esqueleto nunca se muestra. Para respuestas lentas, los estados escalados
 *   informan al usuario de forma apropiada sin reemplazar datos existentes.
 *
 * `refreshing` (opcional):
 *   Cuando hay datos visibles y se actualiza en segundo plano, pasar
 *   `refreshing={true}` muestra un spinner mínimo sin ocultar el contenido.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { cn } from '@/lib/utils';
import {
  SlowLoadingBanner,
  TimeoutState,
  RefreshSpinner,
} from './loading-states';

// ─── Umbrales ─────────────────────────────────────────────────────────────────
const T_SKELETON = 180;     // ms → aparece esqueleto
const T_SLOW     = 3_000;   // ms → advertencia de lentitud
const T_TIMEOUT  = 10_000;  // ms → tiempo agotado (retry)

type Phase = 'content' | 'skeleton' | 'slow' | 'timeout';

function useLoadPhase(loading: boolean): Phase {
  const [phase, setPhase] = useState<Phase>('content');

  useEffect(() => {
    if (!loading) {
      // Deferred para cumplir react-hooks/set-state-in-effect.
      // El setTimeout(fn, 0) es invisible para el usuario (<5 ms).
      const t = setTimeout(() => setPhase('content'), 0);
      return () => clearTimeout(t);
    }

    // Timers escalados — se cancelan todos si loading vuelve a false.
    const t1 = setTimeout(() => setPhase('skeleton'), T_SKELETON);
    const t2 = setTimeout(() => setPhase('slow'),     T_SLOW);
    const t3 = setTimeout(() => setPhase('timeout'),  T_TIMEOUT);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loading]);

  return phase;
}

// ─── Bone ─────────────────────────────────────────────────────────────────────

/**
 * Bloque de placeholder estático (sin animate-pulse para evitar parpadeo).
 */
export function Bone({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-md bg-border/40', className)}
    />
  );
}

// ─── Bones ────────────────────────────────────────────────────────────────────

export function Bones({
  name,
  loading,
  placeholder,
  children,
  className,
  onRetry,
  refreshing = false,
}: {
  /** Nombre del snapshot capturado en `src/bones/`. */
  name: string;
  loading: boolean;
  placeholder: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * Función invocada al pulsar "Reintentar" cuando la carga supera
   * los 10 segundos. Si no se provee, el botón no aparece.
   */
  onRetry?: () => void;
  /**
   * Cuando ya hay datos visibles y se actualiza en segundo plano,
   * pasa `refreshing={true}` para mostrar un spinner discreto sin
   * reemplazar el contenido existente.
   */
  refreshing?: boolean;
}) {
  const phase = useLoadPhase(loading);

  // Tiempo agotado: reemplaza el esqueleto por el estado de error recuperable.
  if (phase === 'timeout') {
    return <TimeoutState onRetry={onRetry} />;
  }

  const showSkeleton = phase === 'skeleton' || phase === 'slow';

  return (
    <div className={cn('relative', className)}>
      {/* Spinner de actualización en segundo plano (no reemplaza contenido) */}
      {refreshing && !showSkeleton && (
        <RefreshSpinner className="absolute right-3 top-3 z-10" />
      )}

      {/* Advertencia de lentitud a los 3 s */}
      {phase === 'slow' && <SlowLoadingBanner />}

      <BoneyardSkeleton
        name={name}
        loading={showSkeleton}
        select="viewport"
        transition={0}
        animate={false}
        fallback={placeholder}
      >
        {showSkeleton ? placeholder : children}
      </BoneyardSkeleton>
    </div>
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

/** Tabla con cabecera y filas. */
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
        <div
          key={r}
          className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0"
        >
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

/** Lista vertical con separadores. */
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

/** Barras de progreso etiquetadas. */
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
 * Silueta del layout completo durante la restauración de sesión.
 * Solo aparece en hard load, no durante la navegación entre rutas.
 */
export function BoneAppShell() {
  return (
    <div
      className="flex h-dvh overflow-hidden bg-background"
      role="status"
      aria-label="Cargando sesión"
    >
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

/** Catálogo agrupado por módulo (permisos). */
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
              <div
                key={i}
                className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3"
              >
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

/** Placeholder para el área de gráficas del dashboard. */
export function BoneChartArea() {
  return <div className="surface h-[290px] bg-border/20" />;
}
