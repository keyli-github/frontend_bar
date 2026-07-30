'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePagination } from '@/hooks/use-pagination';
import { Pagination } from '@/components/shared/pagination';
import { SkeletonProductGrid } from '@/components/shared/skeleton-loader';
import Image from 'next/image';

import { useProductStore } from '@/store/product-store';
import { useAuthStore } from '@/store/auth-store';
import type { Product } from '@/types';
import {
  Plus, Search, LayoutGrid, List, X, Pencil, Trash2,
  ToggleLeft, ToggleRight, Package, TrendingUp, CheckCircle2,
  XCircle, ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── helpers ─── */
const fmt = (n: number) => '$' + n.toLocaleString('es-CO');
const CATEGORIES = ['Cocteles', 'Cervezas', 'Destilados', 'Vinos', 'Snacks', 'Otro'];
const EMOJIS = ['🍸', '🍺', '🥃', '🍷', '🍋', '🍊', '🫧', '🍟', '🌮', '🧃', '🥂', '🍹'];

/* ─── empty form ─── */
const emptyForm = (): Omit<Product, 'id' | 'margin' | 'price' | 'createdAt'> => ({
  name: '', description: '', category: 'Cocteles', image: '/assets/trago.webp',
  emoji: '🍸', salePrice: 0, costPrice: 0, availableInPOS: true, status: 'active',
});

/* ─── sub-components ─── */
function Badge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
      active
        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
        : 'bg-zinc-500/10 border-zinc-500/25 text-zinc-500'
    )}>
      {active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

/* ─── CARD VIEW ─── */
function ProductCard({
  product, canEdit, canDelete, onEdit, onDelete, onToggleStatus, onTogglePOS,
}: {
  product: Product;
  canEdit: boolean; canDelete: boolean;
  onEdit: () => void; onDelete: () => void;
  onToggleStatus: () => void; onTogglePOS: () => void;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-border bg-card flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md dark:hover:shadow-white/5 group',
      product.status === 'inactive' && 'opacity-60',
    )}>
      {/* Image */}
      <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden">
        <Image
          src={product.image || '/assets/trago.webp'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {/* Category badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/50 text-white backdrop-blur-sm">
          {product.category}
        </span>
        {/* POS badge */}
        {product.availableInPOS && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-amber-500/80 text-black text-[10px] font-bold">
            POS
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div>
          <h3 className="font-semibold text-foreground text-sm leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
          )}
        </div>

        {/* Prices */}
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="rounded-lg bg-muted/50 p-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Venta</p>
            <p className="text-xs font-bold text-amber-500">{fmt(product.salePrice)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Costo</p>
            <p className="text-xs font-semibold text-foreground">{fmt(product.costPrice)}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/8 p-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Margen</p>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{product.margin}%</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <Badge active={product.status === 'active'} />
          <span className="text-xl">{product.emoji}</span>
        </div>

        {/* Actions */}
        {(canEdit || canDelete) && (
          <div className="flex gap-1.5 pt-1 border-t border-border">
            {canEdit && (
              <>
                <button
                  onClick={onEdit}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted text-foreground transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={onToggleStatus}
                  className="py-1.5 px-2 rounded-lg text-xs bg-muted/60 hover:bg-muted text-muted-foreground transition-colors"
                  title={product.status === 'active' ? 'Desactivar' : 'Activar'}
                >
                  {product.status === 'active' ? <ToggleRight size={15} className="text-emerald-500" /> : <ToggleLeft size={15} />}
                </button>
                <button
                  onClick={onTogglePOS}
                  className={cn(
                    'py-1.5 px-2 rounded-lg text-xs transition-colors',
                    product.availableInPOS
                      ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  )}
                  title="Toggle disponible en POS"
                >
                  <ShoppingCart size={13} />
                </button>
              </>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="py-1.5 px-2 rounded-lg text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── PRODUCT FORM MODAL ─── */
function ProductModal({
  open, product, onClose, onSave,
}: {
  open: boolean;
  product?: Product;
  onClose: () => void;
  onSave: (data: Omit<Product, 'id' | 'margin' | 'price' | 'createdAt'>) => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState(() => product
    ? { name: product.name, description: product.description, category: product.category,
        image: product.image, emoji: product.emoji, salePrice: product.salePrice,
        costPrice: product.costPrice, availableInPOS: product.availableInPOS, status: product.status }
    : emptyForm()
  );

  if (!open) return null;

  const margin = form.salePrice > 0
    ? Math.round(((form.salePrice - form.costPrice) / form.salePrice) * 100)
    : 0;

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-popover border border-border rounded-2xl shadow-2xl animate-scale-in overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-popover z-10">
          <h2 className="font-bold text-foreground text-base">
            {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Mojito Clásico"
              className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/10 transition-all"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Descripción breve del producto..."
              rows={2}
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm resize-none focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/10 transition-all"
            />
          </div>

          {/* Categoría + Emoji */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoría *</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 transition-all"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emoji</label>
              <select
                value={form.emoji}
                onChange={(e) => set('emoji', e.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 transition-all"
              >
                {EMOJIS.map((em) => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio de venta *</label>
              <input
                type="number"
                value={form.salePrice || ''}
                onChange={(e) => set('salePrice', Number(e.target.value))}
                placeholder="0"
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio de costo *</label>
              <input
                type="number"
                value={form.costPrice || ''}
                onChange={(e) => set('costPrice', Number(e.target.value))}
                placeholder="0"
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 transition-all"
              />
            </div>
          </div>

          {/* Margen calculado */}
          <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Margen de ganancia calculado</span>
            <span className={cn(
              'text-base font-bold',
              margin >= 40 ? 'text-emerald-600 dark:text-emerald-400' :
              margin >= 20 ? 'text-amber-500' : 'text-red-500'
            )}>
              {margin}%
            </span>
          </div>

          {/* Toggles */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => set('availableInPOS', !form.availableInPOS)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all',
                form.availableInPOS
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-muted/50 border-border text-muted-foreground'
              )}
            >
              <ShoppingCart size={15} />
              {form.availableInPOS ? 'Disponible en POS' : 'No en POS'}
            </button>
            <button
              type="button"
              onClick={() => set('status', form.status === 'active' ? 'inactive' : 'active')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all',
                form.status === 'active'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted/50 border-border text-muted-foreground'
              )}
            >
              {form.status === 'active' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {form.status === 'active' ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl bg-muted/60 border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { if (form.name && form.salePrice) onSave(form); }}
            disabled={!form.name || !form.salePrice}
            className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isEdit ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DELETE CONFIRM ─── */
function DeleteModal({ product, onClose, onConfirm }: {
  product: Product; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-6 animate-scale-in text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="font-bold text-foreground text-base mb-1">Eliminar producto</h3>
        <p className="text-sm text-muted-foreground mb-1">
          ¿Eliminar <span className="font-semibold text-foreground">&ldquo;{product.name}&rdquo;</span>?
        </p>
        <p className="text-xs text-muted-foreground mb-5">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-all">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function ProductosPage() {
  const { products, addProduct, updateProduct, deleteProduct, toggleStatus, togglePOS } = useProductStore();
  const { user } = useAuthStore();
  const canManageProducts = user?.rol === 'SUPERADMIN' || user?.rol === 'ADMIN';

  const canCreate = canManageProducts;
  const canEdit   = canManageProducts;
  const canDelete = canManageProducts;

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const filtered = useMemo(() => products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'Todos' || p.category === catFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  }), [products, search, catFilter, statusFilter]);

  const VIEW_SIZE = view === 'grid' ? 15 : 12;
  const { page: pPage, totalPages: pPages, total: pTotal, paginated: pPaginated, goTo: pGoTo, reset: pReset } = usePagination(filtered, { pageSize: VIEW_SIZE });

  const stats = useMemo(() => ({
    total:    products.length,
    activos:  products.filter((p) => p.status === 'active').length,
    inactivos:products.filter((p) => p.status === 'inactive').length,
    enPOS:    products.filter((p) => p.availableInPOS).length,
    valorCatalogo: products.reduce((s, p) => s + p.salePrice, 0),
  }), [products]);

  const categories = ['Todos', ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}><div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Catálogo de Productos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {stats.total} productos · {stats.activos} activos
              {!canCreate && (
                <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">Solo lectura</span>
              )}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-amber-500/15 w-fit"
            >
              <Plus size={16} /> NUEVO PRODUCTO
            </button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: 'TOTAL',         value: String(stats.total),    color: 'text-foreground',  icon: <Package size={16} /> },
            { label: 'ACTIVOS',       value: String(stats.activos),  color: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 size={16} /> },
            { label: 'EN POS',        value: String(stats.enPOS),    color: 'text-amber-500',   icon: <ShoppingCart size={16} /> },
            { label: 'VALOR CATÁLOGO',value: '$' + (stats.valorCatalogo / 1000000).toFixed(2) + 'M', color: 'text-blue-500', icon: <TrendingUp size={16} /> },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                {k.icon}
              </div>
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
                <p className={cn('text-xl font-bold font-mono mt-0.5', k.color)}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  catFilter === c ? 'bg-amber-500 text-black' : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { pReset(); setStatusFilter(e.target.value as 'all' | 'active' | 'inactive'); }}
            className="h-9 px-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-all"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>

          {/* View toggle */}
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setView('grid')}
              className={cn('p-2 rounded-lg border transition-all', view === 'grid' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'border-border text-muted-foreground hover:bg-muted')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('p-2 rounded-lg border transition-all', view === 'list' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'border-border text-muted-foreground hover:bg-muted')}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* ── GRID VIEW ── */}
        {view === 'grid' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 stagger-children">
            {pPaginated.map((p) => (
              <ProductCard
                key={p.id} product={p}
                canEdit={canEdit} canDelete={canDelete}
                onEdit={() => setEditProduct(p)}
                onDelete={() => setDeleteTarget(p)}
                onToggleStatus={() => toggleStatus(p.id)}
                onTogglePOS={() => togglePOS(p.id)}
              />
            ))}
            {pTotal === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No se encontraron productos</p>
              </div>
            )}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Producto', 'Categoría', 'Precio venta', 'Costo', 'Margen', 'POS', 'Estado', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pPaginated.map((p) => (
                    <tr key={p.id} className={cn('hover:bg-muted/30 transition-colors', p.status === 'inactive' && 'opacity-50')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <Image src={p.image || '/assets/trago.webp'} alt={p.name} fill className="object-cover" sizes="36px" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{p.name}</p>
                            {p.description && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{p.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">{p.category}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{fmt(p.salePrice)}</td>
                      <td className="px-4 py-3 text-foreground font-mono">{fmt(p.costPrice)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'font-bold',
                          p.margin >= 40 ? 'text-emerald-600 dark:text-emerald-400' :
                          p.margin >= 20 ? 'text-amber-500' : 'text-red-500'
                        )}>
                          {p.margin}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          p.availableInPOS ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'
                        )}>
                          {p.availableInPOS ? '✓ POS' : 'No POS'}
                        </span>
                      </td>
                      <td className="px-4 py-3"><Badge active={p.status === 'active'} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {canEdit && (
                            <>
                              <button onClick={() => setEditProduct(p)} className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground transition-colors"><Pencil size={13} /></button>
                              <button onClick={() => toggleStatus(p.id)} className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground transition-colors">
                                {p.status === 'active' ? <ToggleRight size={15} className="text-emerald-500" /> : <ToggleLeft size={15} />}
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"><Trash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="py-16 text-center text-muted-foreground text-sm">No se encontraron productos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <ProductModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(data) => { addProduct(data); setCreateOpen(false); }}
      />
      <ProductModal
        open={!!editProduct}
        product={editProduct ?? undefined}
        onClose={() => setEditProduct(null)}
        onSave={(data) => { if (editProduct) { updateProduct(editProduct.id, data); setEditProduct(null); } }}
      />
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => { deleteProduct(deleteTarget.id); setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}
