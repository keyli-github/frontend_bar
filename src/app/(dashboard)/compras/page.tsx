'use client';

import { useState, useEffect } from 'react';
import { usePagination } from '@/hooks/use-pagination';
import { Pagination } from '@/components/shared/pagination';

import { mockPurchaseOrders, mockProveedores } from '@/lib/mock-data';
import type { PurchaseOrder } from '@/types';
import { Plus, Phone, User, X, Package, CheckCircle2, Clock, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const orderFilters = ['Todas', 'Pendiente', 'Enviada', 'Recibida', 'Cancelada'];

const estadoBadge: Record<string, string> = {
  PENDIENTE: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  ENVIADA: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  RECIBIDA: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  CANCELADA: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
};

export default function ComprasPage() {
  const [activeTab, setActiveTab] = useState<'ordenes' | 'proveedores'>('ordenes');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  const filteredOrders = mockPurchaseOrders.filter((o) => {
    if (statusFilter === 'Todas') return true;
    return o.estado === statusFilter.toUpperCase();
  });

  const { page: cPage, totalPages: cPages, total: cTotal, paginated: cPaginated, goTo: cGoTo } = usePagination(filteredOrders, { pageSize: 8 });

  const pendientes = mockPurchaseOrders.filter((o) => o.estado === 'PENDIENTE').length;
  const recibidas = mockPurchaseOrders.filter((o) => o.estado === 'RECIBIDA').length;
  const montoPendiente = mockPurchaseOrders.filter((o) => o.estado === 'PENDIENTE')
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}><div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Compras</h1>
            <p className="text-sm text-muted-foreground mt-1">Ordenes de compra y proveedores</p>
          </div>
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98] w-fit"
          >
            <Plus size={16} />
            NUEVA ORDEN
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: 'ORDENES MES', value: String(mockPurchaseOrders.length), color: 'text-foreground' },
            { label: 'PENDIENTES', value: String(pendientes), color: 'text-amber-500' },
            { label: 'RECIBIDAS', value: String(recibidas), color: 'text-emerald-400' },
            { label: 'MONTO PENDIENTE', value: '$' + (montoPendiente / 1000000).toFixed(2) + 'M', color: 'text-amber-500' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
              <p className={cn('text-base lg:text-lg font-bold font-mono mt-1', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-border animate-fade-in-up">
          {[{ id: 'ordenes', label: 'Ordenes De Compra' }, { id: 'proveedores', label: 'Proveedores' }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'ordenes' | 'proveedores')}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 -mb-px transition-all',
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ordenes tab */}
        {activeTab === 'ordenes' && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-in-up">
              {orderFilters.map((f) => {
                const count = f === 'Todas' ? null :
                  mockPurchaseOrders.filter((o) => o.estado === f.toUpperCase()).length;
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                      statusFilter === f
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {f}{count !== null ? ` (${count})` : ''}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Orden', 'Fecha', 'Proveedor', 'Articulos', 'Total', 'Estado', 'ETA', 'Solicitado por', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cPaginated.map((order) => (
                      <tr key={order.orden} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 text-amber-500 font-mono text-xs font-medium">{order.orden}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{order.fecha}</td>
                        <td className="px-4 py-3 text-foreground">{order.proveedor}</td>
                        <td className="px-4 py-3 text-muted-foreground">{order.articulos} items</td>
                        <td className="px-4 py-3 text-foreground font-semibold font-mono">${order.total.toLocaleString('es-CO')}</td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded border text-[10px] font-bold', estadoBadge[order.estado])}>
                            {order.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{order.eta || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{order.solicitadoPor}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-foreground text-xs hover:bg-muted transition-colors"
                            >
                              Ver detalle
                            </button>
                            {order.estado === 'ENVIADA' && (
                              <button className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors">
                                Recibir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Proveedores tab */}
        {activeTab === 'proveedores' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {mockProveedores.map((prov) => (
              <div key={prov.id} className="rounded-xl border border-border bg-card p-5 hover:border-border transition-colors">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-500 text-lg">🧳</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{prov.nombre}</h3>
                    <p className="text-xs text-amber-500">{prov.categoria}</p>
                  </div>
                </div>
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User size={12} />
                    {prov.contacto}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone size={12} />
                    {prov.telefono}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/60 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Ordenes</p>
                    <p className="text-lg font-bold text-foreground">{prov.ordenes}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-bold text-amber-500">{prov.total}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowNewOrder(false)} />
          <div className="relative w-full max-w-md bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-lg">NUEVA ORDEN DE COMPRA</h3>
              <button onClick={() => setShowNewOrder(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Proveedor</label>
                <select className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm">
                  <option value="">Seleccionar proveedor...</option>
                  {mockProveedores.map((p) => <option key={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha estimada de entrega</label>
                <input type="date" className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Notas adicionales</label>
                <textarea
                  rows={3}
                  placeholder="Instrucciones especiales..."
                  className="w-full mt-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewOrder(false)} className="flex-1 h-10 rounded-lg bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => setShowNewOrder(false)} className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all">
                  CREAR ORDEN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE ORDEN ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-lg bg-popover border border-border rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground text-base">{selectedOrder.orden}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedOrder.proveedor} · {selectedOrder.fecha}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('px-2.5 py-0.5 rounded border text-[10px] font-bold', estadoBadge[selectedOrder.estado])}>
                  {selectedOrder.estado}
                </span>
                <button onClick={() => setSelectedOrder(null)} className="text-muted-foreground hover:text-foreground p-1"><X size={18} /></button>
              </div>
            </div>

            {/* Timeline de estado */}
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estado de la orden</p>
              <div className="flex items-center gap-2">
                {['PENDIENTE', 'ENVIADA', 'RECIBIDA'].map((s, i) => {
                  const steps = ['PENDIENTE', 'ENVIADA', 'RECIBIDA', 'CANCELADA'];
                  const currentIdx = steps.indexOf(selectedOrder.estado);
                  const isActive = i <= currentIdx && selectedOrder.estado !== 'CANCELADA';
                  const isCurrent = s === selectedOrder.estado;
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className={cn('flex items-center gap-1.5 flex-1')}>
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border',
                          isCurrent ? 'bg-amber-500 border-amber-500 text-black' :
                          isActive ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' :
                          'bg-muted/50 border-border text-muted-foreground'
                        )}>
                          {isActive && !isCurrent ? <CheckCircle2 size={12} /> : i + 1}
                        </div>
                        <span className={cn('text-[10px] font-medium hidden sm:block',
                          isCurrent ? 'text-amber-500' : isActive ? 'text-emerald-500' : 'text-muted-foreground'
                        )}>{s}</span>
                      </div>
                      {i < 2 && <div className={cn('flex-1 h-px mx-1', isActive && i < currentIdx ? 'bg-emerald-500/50' : 'bg-border')} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items mock */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Artículos ({selectedOrder.articulos} items)
              </p>
              <div className="space-y-2">
                {Array.from({ length: selectedOrder.articulos }, (_, i) => ({
                  name: ['Whiskey Old Parr 750ml','Corona Extra x24','Vodka Absolut 750ml','Tequila Herradura','Ron Medellín 8 Años','Club Colombia x24','Heineken x24','Coca-Cola 250ml x24'][i % 8],
                  qty: [6, 48, 12, 6, 12, 48, 24, 4][i % 8],
                  price: [95000, 108000, 68000, 82000, 58000, 91200, 120000, 62000][i % 8],
                })).map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Package size={13} className="text-amber-500" />
                      </div>
                      <span className="text-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-muted-foreground text-xs">{item.qty} uds</span>
                      <span className="font-mono font-semibold text-foreground">${(item.price * item.qty / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Total orden: </span>
                <span className="font-bold text-foreground font-mono">${selectedOrder.total.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex gap-2">
                {selectedOrder.estado === 'ENVIADA' && (
                  <button className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 transition-all">
                    Marcar recibida
                  </button>
                )}
                <button onClick={() => setSelectedOrder(null)} className="px-4 py-2 rounded-xl bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
