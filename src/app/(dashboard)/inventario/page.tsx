'use client';

/** Inventario (stock por sede), conectado a InventarioController. */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { PageHeader } from '@/components/shared/page-header';
import { SearchBar } from '@/components/shared/search-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Pagination } from '@/components/shared/pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { Bones, BoneKpis, BoneTable } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { useAuthStore } from '@/store/auth-store';
import { inventarioApi, ApiError } from '@/lib/api';
import { hasPermission } from '@/lib/roles';
import type { InventarioItem, InventarioQuery, InventarioResumen, ProductoCategoria } from '@/types/api';
import { Plus, X, ArrowUp, ArrowDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Todos', 'Cocteles', 'Cervezas', 'Destilados', 'Vinos', 'Snacks', 'Otro'] as const;
const PAGE_SIZE = 25;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

function StockBar({ stock, min, max }: { stock: number; min: number; max: number }) {
  const pct = max > 0 ? Math.min((stock / max) * 100, 100) : 0;
  const color = stock <= min / 2 ? 'bg-red-500' : stock <= min ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function InventarioPage() {
  const router = useRouter();
  const permisos = useAuthStore((state) => state.permisos);
  const boneyardBuild = useBoneyardBuild();
  const canRead = boneyardBuild || hasPermission(permisos, 'inventario:leer');
  const canEdit = hasPermission(permisos, 'inventario:editar');

  const [selectedCat, setSelectedCat] = useState<(typeof CATEGORIES)[number]>('Todos');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [items, setItems] = useState<InventarioItem[]>([]);
  const [resumen, setResumen] = useState<InventarioResumen | null>(null);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Modal de ajuste
  const [adjustItem, setAdjustItem] = useState<InventarioItem | null>(null);
  const [adjustType, setAdjustType] = useState<'entrada' | 'salida'>('entrada');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;

    const query: InventarioQuery = { pagina, limite: PAGE_SIZE };
    if (debouncedSearch) query.q = debouncedSearch;
    if (selectedCat !== 'Todos') query.categoria = selectedCat as ProductoCategoria;

    Promise.all([inventarioApi.listInventario(query), inventarioApi.getInventarioResumen()])
      .then(([lista, kpis]) => {
        if (cancelled) return;
        setItems(lista.data);
        setTotal(lista.total);
        setTotalPaginas(lista.totalPaginas || 1);
        setResumen(kpis);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'No se pudo cargar el inventario.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canRead, pagina, debouncedSearch, selectedCat, reloadKey]);

  /** El spinner se activa aqui, no en el efecto, para no encadenar renders. */
  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

  const openAdjust = (item: InventarioItem) => {
    setAdjustItem(item);
    setAdjustQty('');
    setAdjustType('entrada');
    setAdjustError(null);
  };

  const confirmAdjust = async () => {
    if (!adjustItem) return;
    const cantidad = Number(adjustQty);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setAdjustError('Ingresa una cantidad válida.');
      return;
    }
    setAdjustSaving(true);
    setAdjustError(null);
    try {
      await inventarioApi.ajustarStock(adjustItem.id, {
        tipo: adjustType === 'entrada' ? 'ENTRADA' : 'SALIDA',
        cantidad,
        referencia: 'Ajuste manual',
      });
      setAdjustItem(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setAdjustError(errorMessage(err, 'No se pudo registrar el ajuste.'));
    } finally {
      setAdjustSaving(false);
    }
  };

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes permiso para ver el inventario.
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        <PageHeader
          title="Inventario"
          subtitle={`${total} productos con stock configurado`}
          action={
            <button
              onClick={() => router.push('/productos')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98]"
            >
              <Plus size={15} /> NUEVO PRODUCTO
            </button>
          }
        />

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* KPIs */}
        <Bones name="inventario-kpis" loading={loading} placeholder={<BoneKpis count={4} />}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
            {[
              { label: 'TOTAL PRODUCTOS', value: String(resumen?.totalItems ?? 0), color: 'text-foreground' },
              { label: 'ESTADO CRÍTICO', value: String(resumen?.critico ?? 0), color: 'text-red-500' },
              { label: 'EN ALERTA', value: String(resumen?.alerta ?? 0), color: 'text-amber-500' },
              { label: 'VALOR INVENTARIO', value: '$' + ((resumen?.valorTotal ?? 0) / 1000000).toFixed(1) + 'M', color: 'text-emerald-500' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
                <p className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
                <p className={cn('text-base lg:text-lg font-bold font-mono mt-1', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>
        </Bones>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre o código..."
            className="max-w-xs"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => { setSelectedCat(c); setPagina(1); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  selectedCat === c ? 'bg-amber-500 text-black' : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Bones name="inventario-tabla" loading={loading} placeholder={<BoneTable rows={PAGE_SIZE} cols={9} />}>
            {items.length === 0 ? (
              <EmptyState icon={<Package size={22} />} title="Sin productos" description="Prueba con otros filtros." />
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border">
                      {['Código', 'Producto', 'Categoría', 'Stock', 'Min/Max', 'Estado', 'Costo', 'Ubicación', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.codigo}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <Image src="/assets/trago.webp" alt={item.producto} fill className="object-cover" sizes="28px" />
                            </div>
                            <span className="text-foreground font-medium">{item.producto}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{item.categoria}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn('font-bold', item.estado === 'OK' ? 'text-emerald-500' : item.estado === 'ALERTA' ? 'text-amber-500' : 'text-red-500')}>
                              {item.stock}
                            </span>
                            <StockBar stock={item.stock} min={item.min} max={item.max} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{item.min}/{item.max}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.estado} />
                        </td>
                        <td className="px-4 py-3 text-foreground font-mono">${item.costo.toLocaleString('es-CO')}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{item.ubicacion}</td>
                        <td className="px-4 py-3">
                          {canEdit ? (
                            <button
                              onClick={() => openAdjust(item)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                            >
                              Ajustar
                            </button>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
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

      {/* Ajuste Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !adjustSaving && setAdjustItem(null)} />
          <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-base">AJUSTE DE STOCK</h3>
              <button onClick={() => setAdjustItem(null)} disabled={adjustSaving}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 mb-5 border border-border">
              <p className="text-foreground font-medium">{adjustItem.producto}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {adjustItem.codigo} · Stock actual: <span className="text-amber-500 font-bold">{adjustItem.stock}</span>
              </p>
            </div>
            <div className="flex gap-2 mb-5">
              {(['entrada', 'salida'] as const).map((t) => (
                <button key={t} onClick={() => setAdjustType(t)} className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                  adjustType === t
                    ? t === 'entrada' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500' : 'bg-red-500/15 border-red-500/40 text-red-500'
                    : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                )}>
                  {t === 'entrada' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
                  {t === 'entrada' ? '+ Entrada' : '– Salida'}
                </button>
              ))}
            </div>
            <div className="mb-5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Cantidad</label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="0"
                min={1}
                className="w-full mt-2 h-12 px-4 rounded-xl bg-muted/50 border border-border text-foreground text-lg text-center focus:outline-none focus:border-amber-500/60 transition-all"
              />
            </div>
            {adjustError && (
              <p role="alert" className="mb-4 text-xs text-destructive">{adjustError}</p>
            )}
            <button
              onClick={confirmAdjust}
              disabled={adjustSaving}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adjustSaving ? 'GUARDANDO…' : 'CONFIRMAR AJUSTE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
