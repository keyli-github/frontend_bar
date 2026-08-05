/**
 * ConfirmModal — Modal de confirmación reutilizable
 * Usado en: Productos, Usuarios, Caja, Inventario
 */
'use client';
import { ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

const variantStyles = {
  danger:  { icon: 'bg-red-500/10 border-red-500/25 text-red-500',    btn: 'bg-red-500 hover:bg-red-400 text-white' },
  warning: { icon: 'bg-amber-500/10 border-amber-500/25 text-amber-500', btn: 'bg-amber-500 hover:bg-amber-400 text-black' },
  default: { icon: 'bg-muted border-border text-foreground',           btn: 'bg-amber-500 hover:bg-amber-400 text-black' },
};

export function ConfirmModal({
  open, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'default', onConfirm, onClose, loading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-6 animate-scale-in text-center shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>

        <div className={cn('w-12 h-12 rounded-full border flex items-center justify-center mx-auto mb-4', styles.icon)}>
          <AlertTriangle size={20} />
        </div>

        <h3 className="font-bold text-foreground text-base mb-2">{title}</h3>
        <div className="text-sm text-muted-foreground mb-5">{description}</div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl bg-muted/60 border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn('flex-1 h-10 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50', styles.btn)}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
