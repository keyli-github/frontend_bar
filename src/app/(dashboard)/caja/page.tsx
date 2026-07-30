'use client';

import { useState } from 'react';
import { useUIStore } from '@/store/ui-store';
import { getSedeStats } from '@/lib/sede-data';

import { mockCashMovements } from '@/lib/mock-data';
import { PlusCircle, LogOut, ArrowUp, ArrowDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmt(n: number) {
  const abs = Math.abs(n);
  return '$' + abs.toLocaleString('es-CO');
}

const metodoColors: Record<string, string> = {
  Tarjeta: 'text-blue-400',
  Efectivo: 'text-emerald-400',
  Transferencia: 'text-purple-400',
};

export default function CajaPage() {
  const { selectedSede } = useUIStore();
  const stats = getSedeStats(selectedSede);
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [egresoConcepto, setEgresoConcepto] = useState('');
  const [egresoMonto, setEgresoMonto] = useState('');

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}><div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Control de Caja</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sede: Todas las sedes · Turno actual:{' '}
              <span className="text-amber-500 font-medium">18:00 – cierre</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEgresoModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              <PlusCircle size={16} />
              Registrar egreso
            </button>
            <button
              onClick={() => setShowCerrarModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} />
              Cerrar caja
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: 'APERTURA', value: '$500.000', color: 'text-foreground' },
            { label: 'INGRESOS', value: stats.ingresos, color: 'text-emerald-400' },
            { label: 'EGRESOS', value: stats.egresos, color: 'text-red-400' },
            { label: 'SALDO ACTUAL', value: stats.saldo, color: 'text-amber-500' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
              <p className={cn('text-base lg:text-lg font-bold font-mono mt-1', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          {/* Movements table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Movimientos del turno</h2>
              <span className="text-xs text-muted-foreground">{mockCashMovements.length} registros</span>
            </div>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['ID', 'Hora', 'Tipo', 'Concepto', 'Metodo', 'Monto'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockCashMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{mov.id}</td>
                      <td className="px-4 py-3 text-foreground font-mono">{mov.hora}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold',
                          mov.tipo === 'INGRESO'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        )}>
                          {mov.tipo === 'INGRESO'
                            ? <ArrowUp size={10} />
                            : <ArrowDown size={10} />}
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{mov.concepto}</td>
                      <td className={cn('px-4 py-3 font-medium', metodoColors[mov.metodo] || 'text-muted-foreground')}>
                        {mov.metodo}
                      </td>
                      <td className={cn('px-4 py-3 font-semibold font-mono', mov.monto > 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {mov.monto > 0 ? '+' : ''}{fmt(mov.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            {/* Desglose */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground mb-4">Desglose por metodo</h2>
              <div className="space-y-4">
                {[
                  { label: 'Tarjeta debito/credito', pct: 48, amount: '$781.000', color: 'bg-blue-500', textColor: 'text-blue-400' },
                  { label: 'Efectivo', pct: 29, amount: '$475.000', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                  { label: 'Transferencia', pct: 23, amount: '$370.000', color: 'bg-purple-500', textColor: 'text-purple-400' },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-foreground">{m.label}</span>
                      <span className={cn('text-sm font-bold', m.textColor)}>{m.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', m.color)}
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{m.amount}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Estado caja */}
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">ESTADO DE CAJA</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-400">Caja abierta</span>
              </div>
              <p className="text-xs text-muted-foreground">Apertura: 18:00:00 · Carlos Mendoza</p>
            </div>
          </div>
        </div>
      </div>

      {/* Egreso Modal */}
      {showEgresoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEgresoModal(false)} />
          <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-lg">REGISTRAR EGRESO</h3>
              <button onClick={() => setShowEgresoModal(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Concepto</label>
                <input
                  value={egresoConcepto}
                  onChange={(e) => setEgresoConcepto(e.target.value)}
                  placeholder="Ej: Compra hielo..."
                  className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Monto ($)</label>
                <input
                  value={egresoMonto}
                  onChange={(e) => setEgresoMonto(e.target.value)}
                  placeholder="0"
                  type="number"
                  className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEgresoModal(false)} className="flex-1 h-10 rounded-lg bg-muted/60 border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => setShowEgresoModal(false)} className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all">
                  REGISTRAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cerrar Caja Modal */}
      {showCerrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCerrarModal(false)} />
          <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-6 animate-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <LogOut size={24} className="text-red-400" />
            </div>
            <h3 className="font-bold text-foreground text-lg mb-2">Cerrar Caja</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Esto cerrara el turno actual y generara el resumen. Saldo: <span className="text-amber-500 font-semibold">$1.650.500</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCerrarModal(false)} className="flex-1 h-10 rounded-lg bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={() => setShowCerrarModal(false)} className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-sm tracking-wide transition-all">
                CERRAR CAJA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
