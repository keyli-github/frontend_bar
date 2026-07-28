'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { mockSucursales } from '@/lib/mock-data';
import { Plus, X, MapPin, Users, TrendingUp, Calendar, Building2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const barColors: Record<string, string> = { 'Zona Rosa': '#f59e0b', Chapinero: '#3b82f6', 'El Poblado': '#22c55e' };

const estadoStyle: Record<string, string> = {
  ACTIVA: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
  'EN CONSTRUCCION': 'bg-purple-500/10 border-purple-500/25 text-purple-500',
};

export default function SucursalesPage() {
  const [showNewSede, setShowNewSede] = useState(false);
  const activas = mockSucursales.filter((s) => s.estado === 'ACTIVA').length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Header title="Sucursales" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Sucursales</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Red Bar beer · {activas} sedes operativas</p>
          </div>
          <button
            onClick={() => setShowNewSede(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all active:scale-[0.98] w-fit"
          >
            <Plus size={16} /> AGREGAR SEDE
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: 'SEDES ACTIVAS', value: String(activas), icon: <Building2 size={16} />, color: 'text-foreground' },
            { label: 'EMPLEADOS', value: '31', icon: <Users size={16} />, color: 'text-foreground' },
            { label: 'VENTAS JULIO', value: '$112.6M', icon: <TrendingUp size={16} />, color: 'text-amber-500' },
            { label: 'CAPACIDAD', value: '500', icon: <MapPin size={16} />, color: 'text-blue-500' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">{k.icon}</div>
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
                <p className={cn('text-base lg:text-lg font-bold font-mono mt-0.5', k.color)}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sede cards — horizontal layout */}
        <div className="space-y-3 stagger-children">
          {mockSucursales.map((sede) => (
            <div
              key={sede.id}
              className={cn(
                'rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md dark:hover:shadow-white/5',
                sede.estado === 'ACTIVA' ? 'border-border' : 'border-dashed border-purple-500/30'
              )}
            >
              <div className="flex flex-col md:flex-row">
                {/* Left: color bar + info */}
                <div className="flex-1 p-4 lg:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg', sede.color)}>
                        <Building2 size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-base">{sede.nombre}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={11} /> {sede.ciudad} · {sede.direccion}
                        </p>
                      </div>
                    </div>
                    <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-bold', estadoStyle[sede.estado])}>
                      {sede.estado === 'ACTIVA' ? 'Activa' : 'En construcción'}
                    </span>
                  </div>

                  {sede.estado === 'ACTIVA' ? (
                    <div className="flex flex-wrap gap-4 mt-3">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Ventas hoy</p>
                        <p className="text-sm font-bold text-amber-500">{sede.ventasHoy}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Empleados</p>
                        <p className="text-sm font-bold text-foreground">{sede.empleados}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Ticket prom.</p>
                        <p className="text-sm font-bold text-foreground">{sede.ticketProm}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Participación</p>
                        <p className="text-sm font-bold text-foreground">{sede.participacion}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <Calendar size={14} className="text-purple-500" />
                      Apertura estimada: <span className="text-purple-500 font-semibold">Sep 2026</span>
                    </div>
                  )}
                </div>

                {/* Right: progress bar + admin */}
                {sede.estado === 'ACTIVA' && (
                  <div className="flex flex-col justify-center px-4 py-3 md:px-5 md:w-64 border-t md:border-t-0 md:border-l border-border">
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Participación mes</span>
                        <span className="font-bold" style={{ color: barColors[sede.nombre] }}>{sede.participacion}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${sede.participacion}%`, backgroundColor: barColors[sede.nombre] }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <Users size={11} /> {sede.administrador}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{sede.desde}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chart — Barras horizontales con filtro de mes */}
        <ChartVentasSucursales />
      </div>

      {/* Modal Nueva Sede */}
      {showNewSede && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewSede(false)} />
          <div className="relative w-full max-w-md bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-lg">NUEVA SEDE</h3>
              <button onClick={() => setShowNewSede(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Nombre de la sede', placeholder: 'Ej: Santa Marta' },
                { label: 'Ciudad', placeholder: 'Ej: Santa Marta' },
                { label: 'Dirección', placeholder: 'Ej: Cra 1 #18-20, El Rodadero' },
                { label: 'Administrador', placeholder: 'Nombre del encargado' },
                { label: 'Teléfono', placeholder: '+57 300 000 0000' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{f.label}</label>
                  <input placeholder={f.placeholder} className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all text-sm" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewSede(false)} className="flex-1 h-10 rounded-xl bg-muted/50 border border-border text-foreground text-sm hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => setShowNewSede(false)} className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all">
                  CREAR SEDE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── CHART HORIZONTAL CON FILTRO DE MESES ─── */
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const ventasPorMes: Record<string, { sede: string; ventas: number; color: string }[]> = {
  Julio: [
    { sede: 'Zona Rosa',  ventas: 48600000, color: '#f59e0b' },
    { sede: 'Chapinero',  ventas: 35700000, color: '#d4a017' },
    { sede: 'El Poblado', ventas: 28300000, color: '#b8860b' },
  ],
  Junio: [
    { sede: 'Zona Rosa',  ventas: 42100000, color: '#f59e0b' },
    { sede: 'Chapinero',  ventas: 31200000, color: '#d4a017' },
    { sede: 'El Poblado', ventas: 25800000, color: '#b8860b' },
  ],
  Mayo: [
    { sede: 'Zona Rosa',  ventas: 39500000, color: '#f59e0b' },
    { sede: 'Chapinero',  ventas: 28900000, color: '#d4a017' },
    { sede: 'El Poblado', ventas: 22100000, color: '#b8860b' },
  ],
};

function ChartVentasSucursales() {
  const [selectedMonth, setSelectedMonth] = useState('Julio');
  const [dropOpen, setDropOpen] = useState(false);

  const data = ventasPorMes[selectedMonth] || ventasPorMes['Julio'];
  const maxVenta = Math.max(...data.map((d) => d.ventas));

  const fmt = (n: number) => {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
    return '$' + n;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in-up">
      {/* Header con filtro */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-semibold text-foreground">
            Ventas por Sucursal — <span className="text-amber-500">{selectedMonth}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Vista consolidada de ventas por sucursales</p>
        </div>

        {/* Dropdown mes */}
        <div className="relative">
          <button
            onClick={() => setDropOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm text-foreground hover:bg-muted transition-colors"
          >
            {selectedMonth}
            <ChevronDown size={13} className={cn('text-muted-foreground transition-transform', dropOpen && 'rotate-180')} />
          </button>
          {dropOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-scale-in">
              {MESES.map((m) => (
                <button
                  key={m}
                  onClick={() => { setSelectedMonth(m); setDropOpen(false); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors',
                    m === selectedMonth ? 'text-amber-500 font-medium' : 'text-foreground'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Barras horizontales */}
      <div className="space-y-4">
        {data.map((item) => {
          const pct = (item.ventas / maxVenta) * 100;
          return (
            <div key={item.sede} className="flex items-center gap-3">
              <span className="text-sm text-foreground font-medium w-28 flex-shrink-0 truncate">{item.sede}</span>
              <div className="flex-1 h-7 bg-muted/50 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}CC 100%)`,
                  }}
                />
              </div>
              <span className="text-sm font-bold text-foreground w-16 text-right font-mono">{fmt(item.ventas)}</span>
            </div>
          );
        })}
      </div>

      {/* Línea punteada vertical como referencia */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
        <div className="w-3 h-0.5 border-b border-dashed border-amber-500" />
        <span className="text-[10px] text-muted-foreground">Meta mensual: $50M</span>
      </div>
    </div>
  );
}
