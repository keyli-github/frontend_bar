'use client';

/**
 * Componentes de gráficas del dashboard.
 * Archivo separado para que el import dinámico con { ssr: false } funcione
 * correctamente y recharts no intente usar APIs del DOM en el servidor.
 */
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import type {
  AsistenciaResumen,
  ComprasResumen,
  InventarioResumen,
  Rol,
} from '@/types/api';
import { getRoleLabel } from '@/lib/roles';

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--popover, #ffffff)',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--popover-foreground, #0f172a)',
  boxShadow: '0 8px 30px 0 rgba(0,0,0,0.1)',
};

// Atributos SVG para los ejes de recharts (no CSSProperties)
const TICK = { fontSize: 11, fill: 'var(--muted-foreground, #94a3b8)' } as const;

// ─── Tipos de props para el componente padre ──────────────────────────────────

export interface KardexChartPoint {
  dia: string;
  Entradas: number;
  Salidas: number;
}

export interface DashboardChartsProps {
  kardexData?: KardexChartPoint[] | null;
  inventarioData?: InventarioResumen | null;
  asistenciaData?: AsistenciaResumen | null;
  comprasData?: ComprasResumen | null;
  rolesData?: Rol[] | null;
  totalUsuarios?: number;
  verKardex: boolean;
  verInventario: boolean;
  verAsistencia: boolean;
  verCompras: boolean;
  verRoles: boolean;
}

// ─── Area Chart: Kardex 7 días ────────────────────────────────────────────────

function AreaChartKardex({ data }: { data: KardexChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.32} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gSal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.32} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" vertical={false} />
        <XAxis dataKey="dia" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area
          type="monotone"
          dataKey="Entradas"
          stroke="#2563EB"
          strokeWidth={2.5}
          fill="url(#gEnt)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="Salidas"
          stroke="#F59E0B"
          strokeWidth={2.5}
          fill="url(#gSal)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Horizontal Bar Chart: Usuarios por rol ───────────────────────────────────

function BarChartRoles({ data }: { data: { name: string; Usuarios: number }[] }) {
  const height = Math.max(data.length * 40, 120);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 0 }}>
        <XAxis
          type="number"
          tick={TICK}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={92}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--muted, #f1f5f9)', opacity: 0.5 }} />
        <Bar dataKey="Usuarios" fill="#2563EB" radius={[0, 6, 6, 0]} maxBarSize={22}>
          <LabelList
            dataKey="Usuarios"
            position="right"
            style={{ fontSize: 11, fill: 'var(--muted-foreground, #94a3b8)' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Donut Chart (reutilizable) ───────────────────────────────────────────────

interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

function DonutChart({
  slices,
  centerValue,
  centerLabel,
}: {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={3}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {slices.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
            formatter={(val, name) => [val ?? 0, String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Etiqueta central */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold leading-tight text-foreground">
            {centerValue}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>
      {/* Leyenda */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {slices.map((s) => (
          <span key={s.name} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name} <span className="font-mono font-semibold text-foreground">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal exportado ───────────────────────────────────────────

export default function DashboardCharts({
  kardexData,
  inventarioData,
  asistenciaData,
  comprasData,
  rolesData,
  totalUsuarios = 0,
  verKardex,
  verInventario,
  verAsistencia,
  verCompras,
  verRoles,
}: DashboardChartsProps) {
  // Gráfica de área — kardex últimos 7 días
  const showArea = verKardex && kardexData !== null && kardexData !== undefined;

  // Gráfica de barras — usuarios por rol
  const rolesBarData = (rolesData ?? [])
    .map((r) => ({
      name: getRoleLabel(r.nombre),
      Usuarios: r._count.usuarios,
    }))
    .sort((a, b) => b.Usuarios - a.Usuarios);
  const showRolesBar = verRoles && rolesBarData.length > 0;

  // Donut — inventario
  const invSlices = inventarioData
    ? [
        { name: 'OK', value: inventarioData.ok, color: '#10B981' },
        { name: 'Alerta', value: inventarioData.alerta, color: '#F59E0B' },
        { name: 'Crítico', value: inventarioData.critico, color: '#EF4444' },
      ].filter((s) => s.value > 0)
    : [];
  const showInv = verInventario && inventarioData !== null && inventarioData !== undefined && invSlices.length > 0;

  // Donut — asistencia
  const asistSlices = asistenciaData
    ? [
        { name: 'Presente', value: asistenciaData.presente, color: '#10B981' },
        { name: 'Tardanza', value: asistenciaData.tardanza, color: '#F59E0B' },
        { name: 'Ausente', value: asistenciaData.ausente, color: '#EF4444' },
        { name: 'Día libre', value: asistenciaData.diaLibre, color: '#94A3B8' },
      ].filter((s) => s.value > 0)
    : [];
  const showAsist =
    verAsistencia && asistenciaData !== null && asistenciaData !== undefined && asistSlices.length > 0;

  // Donut — compras
  const otras = comprasData
    ? Math.max(0, comprasData.totalOrdenes - comprasData.pendientes - comprasData.recibidas)
    : 0;
  const comprasSlices = comprasData
    ? [
        { name: 'Pendiente', value: comprasData.pendientes, color: '#F59E0B' },
        { name: 'Recibida', value: comprasData.recibidas, color: '#10B981' },
        { name: 'Otras', value: otras, color: '#94A3B8' },
      ].filter((s) => s.value > 0)
    : [];
  const showCompras =
    verCompras && comprasData !== null && comprasData !== undefined && comprasSlices.length > 0;

  const showAnyDonut = showInv || showAsist || showCompras;

  if (!showArea && !showRolesBar && !showAnyDonut) return null;

  return (
    <div className="space-y-4">
      {/* ── Fila 1: Área + Barras ── */}
      {(showArea || showRolesBar) && (
        <div className={`grid gap-4 ${showArea && showRolesBar ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
          {/* Área kardex */}
          {showArea && (
            <section className="surface p-4 lg:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Movimientos de inventario
                  </h2>
                  <p className="text-[11px] text-muted-foreground">Últimos 7 días — Entradas vs Salidas</p>
                </div>
              </div>
              {kardexData!.length === 0 || kardexData!.every((d) => d.Entradas === 0 && d.Salidas === 0) ? (
                <div className="flex h-[230px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l1.5 1.5M3 12h1M12 3v1M18.5 5.5 17 7M21 12h-1M18.5 18.5 17 17M12 21v-1M5.5 18.5 7 17"/>
                    <circle cx="12" cy="12" r="4"/>
                  </svg>
                  <p className="text-xs">Sin movimientos en los últimos 7 días</p>
                </div>
              ) : (
                <AreaChartKardex data={kardexData!} />
              )}
            </section>
          )}

          {/* Barras por rol */}
          {showRolesBar && (
            <section className="surface p-4 lg:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Usuarios por rol</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {totalUsuarios} usuario{totalUsuarios !== 1 ? 's' : ''} en total
                  </p>
                </div>
              </div>
              <BarChartRoles data={rolesBarData} />
            </section>
          )}
        </div>
      )}

      {/* ── Fila 2: Donuts ── */}
      {showAnyDonut && (
        <div
          className={`grid gap-4 ${
            [showInv, showAsist, showCompras].filter(Boolean).length === 3
              ? 'sm:grid-cols-3'
              : [showInv, showAsist, showCompras].filter(Boolean).length === 2
              ? 'sm:grid-cols-2'
              : ''
          }`}
        >
          {showInv && (
            <section className="surface p-4 lg:p-5">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">Estado del inventario</h2>
                <p className="text-[11px] text-muted-foreground">
                  Valor total: {formatCurrency(inventarioData!.valorTotal)}
                </p>
              </div>
              <DonutChart
                slices={invSlices}
                centerValue={String(inventarioData!.totalItems)}
                centerLabel="Ítems"
              />
            </section>
          )}

          {showAsist && (
            <section className="surface p-4 lg:p-5">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">Asistencia de hoy</h2>
                <p className="text-[11px] text-muted-foreground">
                  {asistenciaData!.fecha}
                </p>
              </div>
              <DonutChart
                slices={asistSlices}
                centerValue={String(asistenciaData!.totalEmpleados)}
                centerLabel="Empleados"
              />
            </section>
          )}

          {showCompras && (
            <section className="surface p-4 lg:p-5">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">Órdenes de compra</h2>
                <p className="text-[11px] text-muted-foreground">
                  {formatCurrency(comprasData!.montoPendiente)} pendiente de pago
                </p>
              </div>
              <DonutChart
                slices={comprasSlices}
                centerValue={String(comprasData!.totalOrdenes)}
                centerLabel="Órdenes"
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
