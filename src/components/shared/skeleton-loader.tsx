/**
 * SkeletonLoader — Skeletons con boneyard-js
 * Usado en: todas las páginas con loading states
 *
 * NOTA: Para capturar bones pixel-perfect, ejecuta:
 *   npx boneyard-js build --wait 1500
 * con el servidor corriendo en http://localhost:3000
 */
'use client';
import { Skeleton } from 'boneyard-js/react';
import { cn } from '@/lib/utils';

/* ─── Fallback shimmer base (se usa hasta que bones sean capturados) ─── */
function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={cn(
      'rounded-lg bg-muted/60 dark:bg-muted/40 animate-pulse',
      className
    )} />
  );
}

/* ─── Skeleton de KPI card ─── */
export function SkeletonKpiCard() {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3 space-y-2">
      <ShimmerBlock className="h-3 w-20" />
      <ShimmerBlock className="h-6 w-28" />
      <ShimmerBlock className="h-2 w-24" />
    </div>
  );
}

/* ─── Grid de 4 KPI skeletons ─── */
export function SkeletonKpiGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonKpiCard key={i} />
      ))}
    </div>
  );
}

/* ─── Skeleton de fila de tabla ─── */
export function SkeletonTableRows({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <ShimmerBlock className={`h-3 ${j === 0 ? 'w-20' : j === 1 ? 'w-28' : 'w-16'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ─── Skeleton de product card (grid) ─── */
export function SkeletonProductCard() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <ShimmerBlock className="h-40 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <ShimmerBlock className="h-3.5 w-3/4" />
        <ShimmerBlock className="h-3 w-1/2" />
        <div className="grid grid-cols-3 gap-1 pt-1">
          {[0,1,2].map((k) => <ShimmerBlock key={k} className="h-10 rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton grid de productos ─── */
export function SkeletonProductGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  );
}

/* ─── Skeleton de card de empleado (Asistencia) ─── */
export function SkeletonEmployeeCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <ShimmerBlock className="h-3.5 w-28" />
          <ShimmerBlock className="h-2.5 w-20" />
        </div>
        <ShimmerBlock className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0,1,2].map((k) => <ShimmerBlock key={k} className="h-12 rounded-lg" />)}
      </div>
    </div>
  );
}

/* ─── Wrapper de boneyard con fallback automático ─── */
interface BoneyardSkeletonProps {
  name: string;
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function BoneyardSkeleton({ name, loading, children, fallback }: BoneyardSkeletonProps) {
  return (
    <Skeleton
      name={name}
      loading={loading}
      animate="shimmer"
      transition={300}
      color="rgba(0,0,0,0.06)"
      darkColor="rgba(255,255,255,0.06)"
      fallback={fallback}
    >
      {children}
    </Skeleton>
  );
}
