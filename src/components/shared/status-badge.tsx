/**
 * StatusBadge — Badge de estado reutilizable
 * Usado en: Inventario, Kardex, Compras, Usuarios, Asistencia, Productos
 */
import { cn } from '@/lib/utils';

const STYLES: Record<string, string> = {
  ok:         'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
  active:     'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
  activo:     'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
  presente:   'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
  recibida:   'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
  success:    'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
  entrada:    'bg-emerald-500/10 border-emerald-500/25 text-emerald-500',
  entry:      'bg-emerald-500/10 border-emerald-500/25 text-emerald-500',

  warning:    'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
  alerta:     'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
  enviada:    'bg-blue-500/10 border-blue-500/25 text-blue-500',
  info:       'bg-blue-500/10 border-blue-500/25 text-blue-500',
  tardanza:   'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',

  danger:     'bg-red-500/10 border-red-500/25 text-red-500',
  critico:    'bg-red-500/10 border-red-500/25 text-red-500',
  ausente:    'bg-red-500/10 border-red-500/25 text-red-500',
  salida:     'bg-red-500/10 border-red-500/25 text-red-500',
  exit:       'bg-red-500/10 border-red-500/25 text-red-500',

  pending:    'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
  pendiente:  'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',

  neutral:    'bg-zinc-500/10 border-zinc-500/25 text-zinc-500',
  cancelada:  'bg-zinc-500/10 border-zinc-500/25 text-zinc-400',
  inactivo:   'bg-zinc-500/10 border-zinc-500/25 text-zinc-400',
  'dia-libre':'bg-zinc-500/10 border-zinc-500/25 text-zinc-400',

  adjust:     'bg-amber-500/10 border-amber-500/25 text-amber-400',
  ajuste:     'bg-amber-500/10 border-amber-500/25 text-amber-400',
  transfer:   'bg-blue-500/10 border-blue-500/25 text-blue-400',
  traslado:   'bg-blue-500/10 border-blue-500/25 text-blue-400',

  purple:     'bg-purple-500/10 border-purple-500/25 text-purple-500',
  superadmin: 'bg-purple-500/10 border-purple-500/25 text-purple-500',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, label, icon, size = 'sm', className }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(' ', '-');
  const style = STYLES[key] ?? STYLES.neutral;
  const text  = label ?? status;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-bold',
      size === 'sm'  ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      style,
      className
    )}>
      {icon}
      {text}
    </span>
  );
}
