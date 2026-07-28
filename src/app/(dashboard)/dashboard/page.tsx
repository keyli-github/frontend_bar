'use client';

import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/shared/stat-card';
import { mockSales, mockTopProducts, mockSalesBySede } from '@/lib/mock-data';
import { getSedeStats } from '@/lib/sede-data';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useProductStore } from '@/store/product-store';
import { DollarSign, TrendingUp, AlertTriangle, Users2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const paymentColors: Record<string, string> = {
  Tarjeta: 'bg-purple-500/15 text-purple-400',
  Efectivo: 'bg-emerald-500/15 text-emerald-400',
  Transferencia: 'bg-blue-500/15 text-blue-400',
};

const tickStyle = { fill: 'var(--color-muted-foreground)', fontSize: 11 };

export default function DashboardPage() {
  const { selectedSede } = useUIStore();
  const { user } = useAuthStore();
  const { products } = useProductStore();

  // Datos filtrados por sede
  const stats = getSedeStats(selectedSede);
  const activeProducts = products.filter((p) => p.status === 'active').length;
  const criticalProducts = products.filter(
    (p) => p.status === 'active' && p.availableInPOS
  ).length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const sedeLabel = selectedSede === 'Todas las sedes' ? 'todas las sedes' : selectedSede;
  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Header title="Dashboard" />

      <div className="p-4 lg:p-6 space-y-5 stagger-children">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">
              {greeting()}, {user?.name?.split(' ')[0] || 'Carlos'} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sedeLabel} · {today}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CAJA ABIERTA
            </span>
            {selectedSede !== 'Todas las sedes' && selectedSede !== 'Todas' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                {selectedSede}
              </span>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Ventas Hoy"
            value={stats.ventasHoy}
            subtitle={`${stats.tickets} tickets emitidos`}
            icon={<DollarSign size={16} />}
            badge={{ text: '+18%', type: 'success' }}
          />
          <StatCard
            label="Ticket Promedio"
            value={stats.ticketProm}
            subtitle="+17% vs semana pasada"
            icon={<TrendingUp size={16} />}
            badge={{ text: '+17%', type: 'success' }}
          />
          <StatCard
            label="Artículos Críticos"
            value={String(stats.articulosCriticos)}
            subtitle="Requieren reposición"
            icon={<AlertTriangle size={16} />}
            badge={{ text: `${stats.articulosCriticos} alertas`, type: 'danger' }}
          />
          <StatCard
            label="Empleados Activos"
            value={String(stats.empleadosActivos)}
            subtitle={`De ${stats.empleadosTotal} programados hoy`}
            icon={<Users2 size={16} />}
            badge={{ text: 'turno noche', type: 'info' }}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Area Chart */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Ventas de la semana</h3>
                <p className="text-xs text-muted-foreground">{sedeLabel} · COP</p>
              </div>
              <span className="text-xs font-mono text-amber-500">{stats.ventasHoy}</span>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weeklySales} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={tickStyle} />
                  <YAxis axisLine={false} tickLine={false} tick={tickStyle} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} width={40} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }}
                    formatter={(v) => [`$${((Number(v) || 0) / 1000000).toFixed(2)}M`, 'Ventas']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} fill="url(#sg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Ventas por sede</h3>
            <p className="text-xs text-muted-foreground mb-3">Distribución hoy</p>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mockSalesBySede} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {mockSalesBySede.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }}
                    formatter={(v) => [`${v}%`, 'Participación']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {mockSalesBySede.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-mono text-foreground">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Products */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Top productos hoy</h3>
              <span className="text-xs text-muted-foreground">{activeProducts} activos</span>
            </div>
            <div className="space-y-3">
              {mockTopProducts.slice(0, 5).map((p) => (
                <div key={p.rank} className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-500 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{p.rank}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-foreground truncate">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">{p.units}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/60">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${p.percentage}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground mb-3">Últimas ventas — {sedeLabel}</h3>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    {['Ticket', 'Hora', 'Arts.', 'Total', 'Método', 'Cajero'].map((h) => (
                      <th key={h} className="pb-2 font-medium text-left last:text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockSales.map((sale) => (
                    <tr key={sale.ticket} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2 font-mono text-amber-500">{sale.ticket}</td>
                      <td className="py-2 text-muted-foreground">{sale.hora}</td>
                      <td className="py-2 text-foreground">{sale.articulos}</td>
                      <td className="py-2 font-mono font-semibold text-foreground">${(sale.total / 1000).toFixed(0)}k</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${paymentColors[sale.metodo]}`}>{sale.metodo}</span>
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{sale.cajero}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Inventory Alerts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Alertas de inventario</h3>
            <span className="text-xs text-red-500 font-medium">{stats.articulosCriticos} críticos</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              { name: 'Whiskey JW Black 750ml', stock: 2, min: 6, critical: true },
              { name: 'Tequila Herradura Plata', stock: 3, min: 6, critical: true },
              { name: 'Coca-Cola 250ml (caja)', stock: 1, min: 4, critical: true },
              { name: 'Agua Tónica Schweppes', stock: 4, min: 6, critical: false },
              { name: 'Ron Medellín 8 Años', stock: 5, min: 6, critical: false },
            ].slice(0, stats.articulosCriticos + 2).map((a) => (
              <div key={a.name} className={`rounded-xl p-3 bg-card border ${a.critical ? 'border-red-500/25' : 'border-amber-500/20'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a.critical ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    {a.critical ? 'CRÍTICO' : 'ALERTA'}
                  </span>
                  <AlertTriangle size={12} className={a.critical ? 'text-red-400' : 'text-amber-400'} />
                </div>
                <p className="text-xs text-foreground font-medium leading-tight">{a.name}</p>
                <p className="text-[10px] mt-1">
                  <span className={a.critical ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>{a.stock} uds</span>
                  <span className="text-muted-foreground"> / min {a.min}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Products summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Productos activos', value: String(activeProducts), color: 'text-emerald-500' },
            { label: 'Disponibles en POS', value: String(criticalProducts), color: 'text-amber-500' },
            { label: 'Total catálogo', value: String(products.length), color: 'text-foreground' },
            { label: 'Inactivos', value: String(products.length - activeProducts), color: 'text-muted-foreground' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
              <p className={`text-lg font-bold font-mono mt-0.5 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
