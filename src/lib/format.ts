/**
 * Formateadores compartidos.
 *
 * Cada pagina declaraba su propio `const fmt = (n) => '$' + n.toLocaleString('es-CO')`.
 * Ademas de duplicarse, cada llamada a `toLocaleString` construye un
 * `Intl.NumberFormat` nuevo; aqui se instancian una sola vez a nivel de
 * modulo, lo que importa cuando se formatean cientos de celdas por render.
 */

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const decimal = new Intl.NumberFormat('es-CO');

/** `$ 24.500` — importes en pesos colombianos. */
export const formatCurrency = (value: number): string => currency.format(value);

/** `24,5 K` — para KPIs donde el espacio es escaso. */
export const formatCompact = (value: number): string => compact.format(value);

/** `24.500` — cantidades sin simbolo de moneda. */
export const formatNumber = (value: number): string => decimal.format(value);

/** `43 %` */
export const formatPercent = (value: number): string => `${Math.round(value)}%`;

/**
 * Tono semantico de un margen de ganancia.
 * Centralizado para que los umbrales no se repitan por pagina.
 */
export function marginTone(margin: number): 'success' | 'warning' | 'danger' {
  if (margin >= 40) return 'success';
  if (margin >= 20) return 'warning';
  return 'danger';
}

export const TONE_TEXT = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
} as const;
