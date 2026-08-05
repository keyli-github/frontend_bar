'use client';

/**
 * Estados de carga centralizados.
 *
 * Componentes disponibles:
 *   SlowLoadingBanner  — advertencia discreta a los 3 s.
 *   TimeoutState       — error recuperable a los 10 s.
 *   NetworkErrorState  — sin conexión a Internet.
 *   ServerErrorState   — error del servidor / API.
 *   OfflineBanner      — franja superior global cuando offline.
 *   RefreshSpinner     — indicador mini para actualizaciones en segundo plano.
 *
 * Principios de diseño:
 *   - Nunca reemplaza contenido existente por estos estados de error cuando
 *     ya hay datos visibles (mostrarlos de forma no destructiva).
 *   - No muestra detalles técnicos al usuario final.
 *   - Todos son accesibles (role, aria-live).
 *   - Respetan prefers-reduced-motion vía las clases de Tailwind.
 */
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Slow loading (3 s) ───────────────────────────────────────────────────────

export function SlowLoadingBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06]',
        'px-3 py-2 text-xs text-amber-600 dark:text-amber-400',
        'mb-3 animate-fade-in',
      )}
    >
      <Clock size={13} className="shrink-0" aria-hidden="true" />
      Los datos están tardando un poco más de lo esperado.
    </div>
  );
}

// ─── Timeout (10 s) ───────────────────────────────────────────────────────────

export function TimeoutState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center"
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Clock size={26} aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-sm text-foreground">
          La información está tardando demasiado en cargar
        </p>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          Verifica tu conexión o vuelve a intentarlo.
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={14} aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  );
}

// ─── Sin conexión ─────────────────────────────────────────────────────────────

export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center"
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <WifiOff size={26} aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-sm text-foreground">Sin conexión a Internet</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          Verifica tu red y vuelve a intentarlo.
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={14} aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  );
}

// ─── Error del servidor ───────────────────────────────────────────────────────

export function ServerErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center"
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <ServerCrash size={26} aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-sm text-foreground">
          No pudimos obtener la información
        </p>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          {message ?? 'Inténtalo nuevamente en unos momentos.'}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={14} aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  );
}

// ─── Banner global offline ────────────────────────────────────────────────────

export function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        'flex items-center justify-center gap-2',
        'bg-amber-500/10 border-b border-amber-500/20 px-4 py-2',
        'text-xs font-medium text-amber-700 dark:text-amber-400',
        'animate-fade-in',
      )}
    >
      <WifiOff size={13} className="shrink-0" aria-hidden="true" />
      Sin conexión. Algunas funciones pueden no estar disponibles.
    </div>
  );
}

// ─── Indicador de actualización en segundo plano ──────────────────────────────

/**
 * Spinner mini para indicar que datos ya visibles se están actualizando.
 * No reemplaza el contenido; se muestra de forma no intrusiva.
 */
export function RefreshSpinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Actualizando"
      className={cn(
        'inline-flex size-4 animate-spin rounded-full',
        'border-2 border-border border-t-muted-foreground',
        className,
      )}
    />
  );
}

// ─── Inline error (para errores dentro de tablas/secciones con data existente) ─

export function InlineErrorBanner({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-lg border border-destructive/25',
        'bg-destructive/[0.06] px-3 py-2.5 text-xs',
        className,
      )}
    >
      <AlertTriangle size={13} className="shrink-0 text-destructive" aria-hidden="true" />
      <span className="flex-1 text-destructive">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-destructive underline-offset-2 hover:underline font-medium"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
