'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { useProductStore } from '@/store/product-store';
import { mockInventory } from '@/lib/mock-data';
import type { InventoryItem } from '@/types';
import { Search, Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const categories = ['Todos', 'Destilados', 'Cervezas', 'Vinos', 'Mixers', 'Snacks'];

const estadoBadge: Record<string, string> = {
  OK: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ALERTA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CRITICO: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function StockBar({ stock, min, max }: { stock: number; min: number; max: number }) {
  const pct = Math.min((stock / max) * 100, 100);
  const color = stock <= min / 2 ? 'bg-red-500' : stock <= min ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function InventarioPage() {
  const router = useRouter();
  const { products: catalogProducts } = useProductStore();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'entrada' | 'salida'>('entrada');
  const [adjustQty, setAdjustQty] = useState('');
  const [showNewProduct, setShowNewProduct] = useState(false);

  const filtered = mockInventory.filter((i) => {
    const matchCat = selectedCategory === 'Todos' || i.categoria === selectedCategory;
    const matchSearch = i.producto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalCritico = mockInventory.filter((i) => i.estado === 'CRITICO').length;
  const totalAlerta = mockInventory.filter((i) => i.estado === 'ALERTA').length;
  const valorInventario = mockInventory.reduce((s, i) => s + i.stock * i.costo, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <Header title="Inventario" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inventario</h1>
            <p className="text-sm text-muted-foreground mt-1">{mockInventory.length} productos · Sede: Todas las sedes</p>
          </div>
          <button
            onClick={() => router.push('/productos')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98] w-fit"
          >
            <Plus size={16} />
            NUEVO PRODUCTO
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: 'TOTAL PRODUCTOS', value: String(mockInventory.length), color: 'text-foreground' },
            { label: 'ESTADO CRITICO', value: String(totalCritico), color: 'text-red-400' },
            { label: 'EN ALERTA', value: String(totalAlerta), color: 'text-amber-500' },
            { label: 'VALOR INVENTARIO', value: '$' + (valorInventario / 1000000).toFixed(1) + 'M', color: 'text-emerald-400' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
              <p className={cn('text-base lg:text-lg font-bold font-mono mt-1', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o codigo..."
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-500/50 text-sm transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  selectedCategory === cat
                    ? 'bg-amber-500 text-black'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Codigo', 'Producto', 'Categoria', 'Stock', 'Min/Max', 'Estado', 'Costo', 'Ubicacion', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.codigo} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.codigo}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="relative w-7 h-7 rounded overflow-hidden bg-muted flex-shrink-0"><Image src="/assets/trago.png" alt={item.producto} fill className="object-cover" sizes="28px" /></div><span className="text-foreground font-medium">{item.producto}</span></div></td>
                    <td className="px-4 py-3 text-muted-foreground">{item.categoria}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-bold',
                          item.estado === 'OK' ? 'text-emerald-400' :
                          item.estado === 'ALERTA' ? 'text-amber-500' : 'text-red-400'
                        )}>{item.stock}</span>
                        <StockBar stock={item.stock} min={item.min} max={item.max} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{item.min} / {item.max}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', estadoBadge[item.estado])}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono">${item.costo.toLocaleString('es-CO')}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{item.ubicacion}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setAdjustItem(item); setAdjustQty(''); setAdjustType('entrada'); }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ajuste de Stock Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAdjustItem(null)} />
          <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-lg">AJUSTE DE STOCK</h3>
              <button onClick={() => setAdjustItem(null)}><X size={20} className="text-muted-foreground" /></button>
            </div>

            {/* Product info */}
            <div className="bg-muted/60 rounded-xl p-4 mb-5 border border-border">
              <p className="text-foreground font-medium">{adjustItem.producto}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {adjustItem.codigo} · Stock actual:{' '}
                <span className="text-amber-500 font-bold">{adjustItem.stock} Botellas</span>
              </p>
            </div>

            {/* Entry/Exit toggle */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setAdjustType('entrada')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  adjustType === 'entrada'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : 'bg-muted/60 border border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <ArrowUp size={16} /> + Entrada
              </button>
              <button
                onClick={() => setAdjustType('salida')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  adjustType === 'salida'
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                    : 'bg-muted/60 border border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <ArrowDown size={16} /> – Salida
              </button>
            </div>

            {/* Quantity */}
            <div className="mb-5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Cantidad (Botellas)</label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="0"
                className="w-full mt-2 h-12 px-4 rounded-xl bg-muted/60 border border-border text-foreground text-lg text-center focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>

            <button
              onClick={() => setAdjustItem(null)}
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-wide transition-all active:scale-[0.98]"
            >
              CONFIRMAR AJUSTE
            </button>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {showNewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowNewProduct(false)} />
          <div className="relative w-full max-w-md bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-lg">NUEVO PRODUCTO</h3>
              <button onClick={() => setShowNewProduct(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Nombre del producto', placeholder: 'Ej: Whiskey Chivas 750ml' },
                { label: 'Codigo', placeholder: 'Ej: DES-007' },
                { label: 'Costo unitario ($)', placeholder: '0' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</label>
                  <input placeholder={f.placeholder} className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all text-sm" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Categoria</label>
                  <select className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm">
                    {categories.filter(c => c !== 'Todos').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Stock inicial</label>
                  <input type="number" placeholder="0" className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewProduct(false)} className="flex-1 h-10 rounded-lg bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => setShowNewProduct(false)} className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all">
                  CREAR PRODUCTO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
