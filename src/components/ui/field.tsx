'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Field — etiqueta + control + ayuda/error.
 *
 * Sustituye al patron repetido en los formularios:
 *   <label className="text-xs font-semibold ...">Nombre *</label>
 *   <input className="w-full mt-1.5 h-10 ..." />
 *
 * Ademas cablea la accesibilidad que faltaba: `htmlFor`/`id` reales,
 * `aria-describedby` hacia el texto de ayuda y `aria-invalid` cuando hay
 * error, de modo que un lector de pantalla anuncie el fallo del campo.
 */
export function Field({
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  /** Recibe las props que deben aplicarse al control. */
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
    required?: boolean;
  }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(obligatorio)</span>}
      </label>

      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        required,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
