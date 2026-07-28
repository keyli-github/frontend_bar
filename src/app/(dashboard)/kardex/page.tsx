'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { mockKardex } from '@/lib/mock-data';
import { Search, Download, ArrowUp, ArrowDown, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/shared/date-picker';

const filters = ['Todos', 'ENTRADA', 'SALIDA', 'AJUSTE', 'TRASLADO'];

const tipoBadge: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  ENTRADA: { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', text: 'ENTRADA', icon: <ArrowUp size={10} /> },
  SALIDA: { bg: 'bg-red-500/10 border-red-500/30 text-red-400', text: 'SALIDA', icon: <ArrowDown size={10} /> },
  AJUSTE: { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', text: 'AJUSTE', icon: <Zap size={10} /> },
  TRASLADO: { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', text: 'TRASLADO', icon: <ArrowRight size={10} /> },
};

export default function KardexPage() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo]   = useState<Date | undefined>();

  const filtered = mockKardex.filter((k) => {
    const matchFilter = activeFilter === 'Todos' || k.tipo === activeFilter;
    const matchSearch = k.producto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalEntradas = mockKardex.filter((k) => k.tipo === 'ENTRADA').length;
  const totalSalidas = mockKardex.filter((k) => k.tipo === 'SALIDA').length;
  const valorMovimiento = mockKardex.reduce((s, k) => s + Math.abs(k.valor), 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <Header title="Kardex" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Kardex de Inventario</h1>
            <p className="text-sm text-muted-foreground mt-1">Historial de movimientos de stock</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/60 transition-colors w-fit">
            <Download size={16} />
            Exportar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: 'TOTAL MOVIMIENTOS', value: String(mockKardex.length), color: 'text-foreground' },
            { label: 'ENTRADAS', value: String(totalEntradas), color: 'text-emerald-400' },
            { label: 'SALIDAS', value: String(totalSalidas), color: 'text-red-400' },
            { label: 'VALOR EN MOVIMIENTO', value: '$' + (valorMovimiento / 1000000).toFixed(2) + 'M', color: 'text-amber-500' },
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
                onClick={() => setActiveFilter(f)}
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
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Desde" />
            <DatePicker value={dateTo}   onChange={setDateTo}   placeholder="Hasta" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
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
                {filtered.map((k) => {
                  const badge = tipoBadge[k.tipo];
                  return (
                    <tr key={k.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-amber-500 font-mono text-xs font-medium">{k.id}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{k.fecha}</td>
                      <td className="px-4 py-3 text-foreground font-mono text-xs">{k.hora}</td>
                      <td className="px-4 py-3 text-foreground font-medium">{k.producto}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{k.codigo}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold', badge.bg)}>
                          {badge.icon}{badge.text}
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
        </div>
      </div>
    </div>
  );
}
