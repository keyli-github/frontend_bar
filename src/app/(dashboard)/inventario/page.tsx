'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { SearchBar } from '@/components/shared/search-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Pagination } from '@/components/shared/pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmModal } from '@/components/shared/confirm-modal';
import { SkeletonTableRows, SkeletonKpiGrid, BoneyardSkeleton } from '@/components/shared/skeleton-loader';
import { usePagination } from '@/hooks/use-pagination';
import { mockInventory } from '@/lib/mock-data';
import type { InventoryItem } from '@/types';
import { Plus, X, ArrowUp, ArrowDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Todos', 'Destilados', 'Cervezas', 'Vinos', 'Mixers', 'Snacks'];
const PAGE_SIZE  = 10;

function StockBar({ stock, min, max }: { stock: number; min: number; max: number }) {
  const pct   = Math.min((stock / max) * 100, 100);
  const color = stock <= min / 2 ? 'bg-red-500' : stock <= min ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function InventarioPage() {
  const router = useRouter();
  const [loading, setLoading]         = useState(true);
  const [selectedCat, setSelectedCat] = useState('Todos');
  const [search, setSearch]           = useState('');
  const [adjustItem, setAdjustItem]   = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType]   = useState<'entrada' | 'salida'>('entrada');
  const [adjustQty, setAdjustQty]     = useState('');
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const filtered = mockInventory.filter((i) => {
    const matchCat    = selectedCat === 'Todos' || i.categoria === selectedCat;
    const matchSearch = i.producto.toLowerCase().includes(search.toLowerCase()) ||
                        i.codigo.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const { page, totalPages, total, paginated, goTo, reset } = usePagination(filtered, { pageSize: PAGE_SIZE });

  const totalCritico = mockInventory.filter((i) => i.estado === 'CRITICO').length;
  const totalAlerta  = mockInventory.filter((i) => i.estado === 'ALERTA').length;
  const valorInv     = mockInventory.reduce((s, i) => s + i.stock * i.costo, 0);

  const handleSearch = (v: string) => { setSearch(v); reset(); };
  const handleCat    = (c: string)  => { setSelectedCat(c); reset(); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Header title="Inventario" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        <PageHeader
          title="Inventario"
          subtitle={`${mockInventory.length} productos · Sede: Todas las sedes`}
          action={
            <button
              onClick={() => router.push('/productos')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98]"
            >
              <Plus size={15} /> NUEVO PRODUCTO
            </button>
          }
        />

        {/* KPIs */}
        <BoneyardSkeleton name="inventario-kpis" loading={loading} fallback={<SkeletonKpiGrid />}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
            {[
              { label: 'TOTAL PRODUCTOS',  value: String(mockInventory.length), color: 'text-foreground' },
              { label: 'ESTADO CRÍTICO',   value: String(totalCritico),         color: 'text-red-500'  },
              { label: 'EN ALERTA',        value: String(totalAlerta),          color: 'text-amber-500' },
              { label: 'VALOR INVENTARIO', value: '$' + (valorInv / 1000000).toFixed(1) + 'M', color: 'text-emerald-500' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
                <p className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
                <p className={cn('text-base lg:text-lg font-bold font-mono mt-1', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>
        </BoneyardSkeleton>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Buscar por nombre o código..."
            className="max-w-xs"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => handleCat(c)}
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
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  {['Código','Producto','Categoría','Stock','Min/Max','Estado','Costo','Ubicación',''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <SkeletonTableRows rows={PAGE_SIZE} cols={9} />
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={9}><EmptyState icon={<Package size={22} />} title="Sin productos" description="Prueba con otros filtros." /></td></tr>
                ) : (
                  paginated.map((item) => (
                    <tr key={item.codigo} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.codigo}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <Image src="/assets/trago.png" alt={item.producto} fill className="object-cover" sizes="28px" />
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
                        <button
                          onClick={() => { setAdjustItem(item); setAdjustQty(''); setAdjustType('entrada'); }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="border-t border-border px-4">
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={goTo} />
            </div>
          )}
        </div>
      </div>

      {/* Ajuste Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAdjustItem(null)} />
          <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-base">AJUSTE DE STOCK</h3>
              <button onClick={() => setAdjustItem(null)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 mb-5 border border-border">
              <p className="text-foreground font-medium">{adjustItem.producto}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {adjustItem.codigo} · Stock actual: <span className="text-amber-500 font-bold">{adjustItem.stock}</span>
              </p>
            </div>
            <div className="flex gap-2 mb-5">
              {(['entrada','salida'] as const).map((t) => (
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
              <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="0"
                className="w-full mt-2 h-12 px-4 rounded-xl bg-muted/50 border border-border text-foreground text-lg text-center focus:outline-none focus:border-amber-500/60 transition-all" />
            </div>
            <button onClick={() => setAdjustItem(null)} className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-wide transition-all">
              CONFIRMAR AJUSTE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
