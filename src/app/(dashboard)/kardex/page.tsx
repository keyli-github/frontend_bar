'use client';

/** Kardex de inventario, conectado a KardexController (solo lectura). */
import { useCallback, useEffect, useState } from 'react';

import { Pagination } from '@/components/shared/pagination';
import { Bones, BoneTable } from '@/components/shared/bones';
import { EmptyState } from '@/components/shared/empty-state';
import { DatePicker } from '@/components/shared/date-picker';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { useAuthStore } from '@/store/auth-store';
import { kardexApi, ApiError } from '@/lib/api';
import { hasPermission } from '@/lib/roles';
import { cn } from '@/lib/utils';
import type { KardexMovimiento, KardexQuery, MovimientoTipo } from '@/types/api';
import { Search, Download, ArrowUp, ArrowDown, Zap, ArrowRight, History } from 'lucide-react';

const PAGE_SIZE = 25;

const filters = ['Todos', 'ENTRADA', 'SALIDA', 'AJUSTE', 'TRASLADO'] as const;

const tipoBadge: Record<MovimientoTipo, { bg: string; icon: React.ReactNode }> = {
  ENTRADA: { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', icon: <ArrowUp size={10} /> },
  SALIDA: { bg: 'bg-red-500/10 border-red-500/30 text-red-400', icon: <ArrowDown size={10} /> },
  AJUSTE: { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', icon: <Zap size={10} /> },
  TRASLADO: { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', icon: <ArrowRight size={10} /> },
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/** Date -> 'YYYY-MM-DD' en hora local (formato que espera el backend). */
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function KardexPage() {
  const permisos = useAuthStore((state) => state.permisos);
  const boneyardBuild = useBoneyardBuild();
  const canRead = true; // El permiso kardex:leer no existe aun en el backend

  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [movimientos, setMovimientos] = useState<KardexMovimiento[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Debounce de la busqueda; cualquier cambio de filtro vuelve a la pagina 1. */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;

    const query: KardexQuery = { pagina, limite: PAGE_SIZE };
    if (debouncedSearch) query.q = debouncedSearch;
    if (activeFilter !== 'Todos') query.tipo = activeFilter;
    if (dateFrom) query.desde = toYmd(dateFrom);
    if (dateTo) query.hasta = toYmd(dateTo);

    kardexApi
      .listKardex(query)
      .then((res) => {
        if (cancelled) return;
        setMovimientos(res.data);
        setTotal(res.total);
        setTotalPaginas(res.totalPaginas || 1);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'No se pudo cargar el kardex.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canRead, pagina, debouncedSearch, activeFilter, dateFrom, dateTo]);

  /** El spinner se activa aqui, no en el efecto, para no encadenar renders. */
  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes permiso para ver el kardex.
      </div>
    );
  }

  /** KPIs derivados de la pagina cargada (el backend no expone un resumen). */
  const pageEntradas = movimientos.filter((k) => k.tipo === 'ENTRADA').length;
  const pageSalidas = movimientos.filter((k) => k.tipo === 'SALIDA').length;
  const pageValor = movimientos.reduce((s, k) => s + Math.abs(k.valor), 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Kardex de Inventario</h1>
            <p className="text-sm text-muted-foreground mt-1">Historial de movimientos de stock</p>
          </div>
          <button
            disabled
            title="Exportación no disponible"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm font-medium w-fit opacity-50 cursor-not-allowed"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: 'TOTAL MOVIMIENTOS', value: String(total), color: 'text-foreground' },
            { label: 'ENTRADAS (PÁGINA)', value: String(pageEntradas), color: 'text-emerald-400' },
            { label: 'SALIDAS (PÁGINA)', value: String(pageSalidas), color: 'text-red-400' },
            { label: 'VALOR (PÁGINA)', value: '$' + pageValor.toLocaleString('es-CO'), color: 'text-amber-500' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
              <p className={cn('text-base lg:text-lg font-bold font-mono mt-1', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up">
          <div className="relative max-w-xs flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto, codigo o referencia..."
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-500/50 text-sm transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => { setActiveFilter(f); setPagina(1); }}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  activeFilter === f
                    ? 'bg-amber-500 text-black'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <DatePicker value={dateFrom} onChange={(d) => { setDateFrom(d); setPagina(1); }} placeholder="Desde" />
            <DatePicker value={dateTo} onChange={(d) => { setDateTo(d); setPagina(1); }} placeholder="Hasta" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
          <Bones name="kardex-tabla" loading={loading} placeholder={<BoneTable rows={PAGE_SIZE} cols={12} />}>
            {movimientos.length === 0 ? (
              <EmptyState icon={<History size={22} />} title="Sin movimientos" description="No hay movimientos con los filtros aplicados." />
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['ID', 'Fecha', 'Hora', 'Producto', 'Codigo', 'Tipo', 'Cant.', 'Stock ant.', 'Stock nuevo', 'Valor', 'Referencia', 'Usuario'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movimientos.map((k) => {
                      const badge = tipoBadge[k.tipo];
                      return (
                        <tr key={k.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 text-amber-500 font-mono text-xs font-medium">{k.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{k.fecha}</td>
                          <td className="px-4 py-3 text-foreground font-mono text-xs">{k.hora}</td>
                          <td className="px-4 py-3 text-foreground font-medium">{k.producto}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{k.codigo}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold', badge.bg)}>
                              {badge.icon}{k.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'font-bold',
                              k.tipo === 'ENTRADA' ? 'text-emerald-400' :
                              k.tipo === 'SALIDA' ? 'text-red-400' :
                              k.tipo === 'AJUSTE' ? 'text-amber-400' : 'text-blue-400'
                            )}>
                              {k.tipo === 'SALIDA' || (k.tipo === 'AJUSTE' && k.cantidad < 0) ? '' : '+'}
                              {k.cantidad} {k.unidad}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{k.stockAnterior}</td>
                          <td className="px-4 py-3 text-foreground font-semibold">{k.stockNuevo}</td>
                          <td className="px-4 py-3 text-foreground font-mono">${k.valor.toLocaleString('es-CO')}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-[120px] truncate">{k.referencia}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{k.usuario}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Bones>
          {/* Paginación */}
          <div className="border-t border-border px-4">
            <Pagination page={pagina} totalPages={totalPaginas} total={total} pageSize={PAGE_SIZE} onPageChange={irAPagina} />
          </div>
        </div>
      </div>
    </div>
  );
}
