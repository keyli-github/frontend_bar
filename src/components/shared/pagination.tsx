/**
 * Pagination — Controles de paginación reutilizables
 * Props: page, totalPages, total, pageSize, goTo
 */
'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, pageSize = 10, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Generar rango de páginas visibles
  const getPages = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end   = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={cn('flex items-center justify-between gap-4 py-3 px-1', className)}>
      {/* Info */}
      <p className="text-xs text-muted-foreground hidden sm:block">
        Mostrando <span className="font-medium text-foreground">{from}–{to}</span> de{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              /* La pagina actual se deshabilita: al pulsarla, el consumidor
                 ponia loading=true pero la dependencia del efecto no cambiaba,
                 dejando la tabla en "Cargando..." para siempre. */
              disabled={p === page}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Página ${p}`}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all',
                p === page
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm cursor-default'
                  : 'border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
