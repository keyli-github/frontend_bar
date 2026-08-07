'use client';

/**
 * Dashboard.
 *
 * Fuentes de datos:
 *   GET /api/caja/actual         → saldo de caja
 *   GET /api/categorias          → total de categorias
 *   GET /api/productos/resumen   → KPIs del catalogo
 *   GET /api/inventario/resumen  → stock y alertas
 *   GET /api/kardex/resumen      → movimientos
 *   GET /api/kardex?desde&hasta  → grafica de area (7 dias)
 *   GET /api/compras/resumen     → ordenes
 *   GET /api/asistencia/resumen  → asistencia del dia
 *   GET /api/roles               → usuarios por rol   (roles:leer)
 *   GET /api/establecimientos    → sedes              (establecimientos:leer)
 *   GET /api/audit               → actividad reciente (audit:leer)
 *   GET /api/auth/sesiones       → sesiones propias
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import {
  asistenciaApi,
  auditApi,
  authApi,
  categoriasApi,
  comprasApi,
  establecimientosApi,
  inventarioApi,
  kardexApi,
  productosApi,
  rolesApi,
} from '@/lib/api';
import * as cajaApi from '@/lib/api/caja.api';
import * as ventasApi from '@/lib/api/ventas.api';
import { formatCurrency } from '@/lib/format';
import { getRoleLabel, hasPermission } from '@/lib/roles';
import type {
  AsistenciaResumen,
  AuditLog,
  ComprasResumen,
  Establecimiento,
  InventarioResumen,
  KardexResumen,
  ProductoResumen,
  Rol,
  SessionInfo,
} from '@/types/api';
import type { CajaSesion } from '@/types/caja';
import type { KardexChartPoint, VentaChartPoint } from './_charts';
import {
  ArrowRight,
  Boxes,
  Building2,
  ClipboardCheck,
  History,
  Landmark,
  Monitor,
  Package,
  ScrollText,
  Shield,
  Tags,
  Truck,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bones, BoneList } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';

// ─── Gráficas con import dinámico (recharts usa DOM) ─────────────────────────
const DashboardCharts = dynamic(() => import('./_charts'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="surface h-[290px] bg-muted/20" />
        <div className="surface h-[290px] bg-muted/20" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface h-[240px] bg-muted/20" />
        ))}
      </div>
    </div>
  ),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dateFmt = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function accionTone(accion: string): string {
  if (
    accion.includes('ELIMINAR') ||
    accion.includes('BLOQUEADA') ||
    accion.includes('REUSO')
  )
    return 'text-destructive';
  if (accion.includes('CREAR')) return 'text-success';
  return 'text-muted-foreground';
}

async function loadOptional<T>(
  enabled: boolean,
  loader: () => Promise<T>,
): Promise<T | null> {
  if (!enabled) return null;
  try {
    return await loader();
  } catch {
    return null;
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface OperationalData {
  categorias: number | null;
  productos: ProductoResumen | null;
  inventario: InventarioResumen | null;
  kardex: KardexResumen | null;
  compras: ComprasResumen | null;
  asistencia: AsistenciaResumen | null;
  caja: CajaSesion | null;
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const permisos = useAuthStore((s) => s.permisos);
  const boneyardBuild = useBoneyardBuild();

  const verRoles      = boneyardBuild || hasPermission(permisos, 'roles:leer');
  const verSedes      = boneyardBuild || hasPermission(permisos, 'establecimientos:leer');
  const verAudit      = boneyardBuild || hasPermission(permisos, 'audit:leer');
  const verCategorias = boneyardBuild || hasPermission(permisos, 'categorias:leer');
  const verProductos  = boneyardBuild || hasPermission(permisos, 'productos:leer');
  const verInventario = boneyardBuild || hasPermission(permisos, 'inventario:leer');
  const verKardex     = boneyardBuild || hasPermission(permisos, 'kardex:leer');
  const verCompras    = boneyardBuild || hasPermission(permisos, 'compras:leer');
  const verAsistencia = boneyardBuild || hasPermission(permisos, 'asistencia:leer');
  const verCaja       = boneyardBuild || hasPermission(permisos, 'caja:leer');

  // ── Estado ────────────────────────────────────────────────────────────────
  const [roles, setRoles]         = useState<Rol[] | null>(null);
  const [sedes, setSedes]         = useState<Establecimiento[] | null>(null);
  const [logs, setLogs]           = useState<AuditLog[] | null>(null);
  const [sesiones, setSesiones]   = useState<SessionInfo[] | null>(null);
  const [operacion, setOperacion] = useState<OperationalData | null>(null);
  const [kardexChart, setKardexChart] = useState<KardexChartPoint[] | null>(null);
  const [ventasChart, setVentasChart] = useState<VentaChartPoint[] | null>(null);
  const [ventasTotalHoy, setVentasTotalHoy] = useState(0);
  const [ventasTotalMes, setVentasTotalMes] = useState(0);
  const [ventasCountHoy, setVentasCountHoy] = useState(0);

  // ── Efectos ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!verRoles) return;
    rolesApi
      .listRoles({ limite: 100 })
      .then((d) => !cancelled && setRoles(d.data))
      .catch(() => !cancelled && setRoles([]));
    return () => { cancelled = true; };
  }, [verRoles]);

  useEffect(() => {
    let cancelled = false;
    if (!verSedes) return;
    establecimientosApi
      .listEstablecimientos({ limite: 100 })
      .then((d) => !cancelled && setSedes(d.data))
      .catch(() => !cancelled && setSedes([]));
    return () => { cancelled = true; };
  }, [verSedes]);

  useEffect(() => {
    let cancelled = false;
    if (!verAudit) return;
    auditApi
      .listAuditLogs({ pagina: 1, limite: 8 })
      .then((d) => !cancelled && setLogs(d.data))
      .catch(() => !cancelled && setLogs([]));
    return () => { cancelled = true; };
  }, [verAudit]);

  useEffect(() => {
    let cancelled = false;
    authApi
      .getSesiones()
      .then((d) => !cancelled && setSesiones(d))
      .catch(() => !cancelled && setSesiones([]));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadOptional(verCategorias, () =>
        categoriasApi.listCategorias({ pagina: 1, limite: 1 }).then((r) => r.total),
      ),
      loadOptional(verProductos, productosApi.getProductosResumen),
      loadOptional(verInventario, () => inventarioApi.getInventarioResumen()),
      loadOptional(verKardex,     () => kardexApi.getKardexResumen()),
      loadOptional(verCompras,    () => comprasApi.getComprasResumen()),
      loadOptional(verAsistencia, () => asistenciaApi.getAsistenciaResumen()),
      loadOptional(verCaja && Boolean(user?.sedeId), () =>
        cajaApi.getCajaActual(user?.sedeId ?? undefined),
      ),
    ]).then(
      ([categorias, productos, inventario, kardex, compras, asistencia, caja]) => {
        if (cancelled) return;
        setOperacion({ categorias, productos, inventario, kardex, compras, asistencia, caja });
      },
    );
    return () => { cancelled = true; };
  }, [
    user?.sedeId,
    verAsistencia, verCaja, verCategorias, verCompras,
    verInventario, verKardex, verProductos,
  ]);

  useEffect(() => {
    if (!verKardex) return;
    let cancelled = false;

    const today = new Date();
    const desde = new Date(today);
    desde.setDate(desde.getDate() - 6);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    kardexApi
      .listKardex({
        desde: desde.toISOString().split('T')[0],
        hasta: today.toISOString().split('T')[0],
        limite: 100,
      })
      .then((result) => {
        if (cancelled) return;
        const byDay: Record<string, { Entradas: number; Salidas: number }> = {};
        days.forEach((d) => { byDay[d] = { Entradas: 0, Salidas: 0 }; });
        for (const mov of result.data) {
          if (byDay[mov.fecha]) {
            if (mov.tipo === 'ENTRADA') byDay[mov.fecha].Entradas++;
            else if (mov.tipo === 'SALIDA') byDay[mov.fecha].Salidas++;
          }
        }
        setKardexChart(
          days.map((day) => ({
            dia: DAY_NAMES[new Date(`${day}T12:00:00`).getDay()],
            Entradas: byDay[day].Entradas,
            Salidas:  byDay[day].Salidas,
          })),
        );
      })
      .catch(() => { if (!cancelled) setKardexChart([]); });

    return () => { cancelled = true; };
  }, [verKardex]);

  // Ventas para cajero / vendedora (últimos 7 días)
  const verMisVentas  = hasPermission(permisos, 'ventas:leer-propias');
  const verTodasVentas = hasPermission(permisos, 'ventas:leer');

  useEffect(() => {
    const canLoad = verMisVentas || verTodasVentas;
    if (!canLoad) return;
    let cancelled = false;

    const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    const hoy   = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const mes   = new Date(today.getFullYear(), today.getMonth(), 1);
    const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 6);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy); d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const loader = verMisVentas
      ? () => ventasApi.listMisVentas({ limite: 200, pagina: 1 })
      : () => ventasApi.listVentas({ limite: 200, pagina: 1 });

    loader().then((result) => {
      if (cancelled) return;
      const byDay: Record<string, number> = {};
      days.forEach((d) => { byDay[d.toISOString().split('T')[0]] = 0; });

      let totalHoy = 0, totalMes = 0, countHoy = 0;

      for (const v of result.data) {
        if (v.estado === 'ANULADA') continue;
        const total = v.total ?? 0;
        const dt = new Date(v.createdAt);
        const dKey = dt.toISOString().split('T')[0];
        if (byDay[dKey] !== undefined) byDay[dKey] += total;
        const dNorm = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        if (dNorm >= hoy) { totalHoy += total; countHoy++; }
        if (dNorm >= mes) totalMes += total;
      }

      setVentasTotalHoy(totalHoy);
      setVentasTotalMes(totalMes);
      setVentasCountHoy(countHoy);
      setVentasChart(
        days.map((d) => ({
          dia: DAY_NAMES_ES[d.getDay()],
          total: byDay[d.toISOString().split('T')[0]] ?? 0,
          cantidad: 0,
        })),
      );
    }).catch(() => { if (!cancelled) setVentasChart([]); });

    return () => { cancelled = true; };
  }, [verMisVentas, verTodasVentas]);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const totalUsuarios = roles?.reduce((n, r) => n + r._count.usuarios, 0) ?? null;
  const sedesActivas  = sedes?.filter((s) => s.activo).length ?? null;

  /**
   * Una única colección de tarjetas compactas: módulos operativos primero,
   * luego los indicadores administrativos.
   * `value === null` = aún cargando → muestra '—'.
   */
  const allCards: Array<{
    label: string;
    value: string | number | null;
    detail: string;
    icon: React.ElementType;
    href: string;
    tone: string;
  }> = [
    ...(verCaja ? [{
      label: 'Caja',
      value: operacion
        ? operacion.caja
          ? formatCurrency(operacion.caja.resumen.version === 'V2'
              ? operacion.caja.resumen.efectivoEsperado
              : (operacion.caja.resumen as { saldoEsperado: number }).saldoEsperado)
          : 'Cerrada'
        : null,
      detail: operacion?.caja
        ? operacion.caja.resumen.version === 'V2'
          ? `${formatCurrency(operacion.caja.resumen.totalVentasNeto)} en ventas`
          : `${formatCurrency((operacion.caja.resumen as { totalEntradas: number }).totalEntradas)} entradas`
        : 'Sin turno abierto',
      icon: Landmark,
      href: '/caja',
      tone: operacion?.caja ? 'text-emerald-500' : 'text-muted-foreground',
    }] : []),
    ...(verProductos ? [{
      label: 'Productos',
      value: operacion ? (operacion.productos?.total ?? 0) : null,
      detail: `${operacion?.productos?.activos ?? 0} activos`,
      icon: Package,
      href: '/productos',
      tone: 'text-amber-500',
    }] : []),
    ...(verCategorias ? [{
      label: 'Categorías',
      value: operacion ? (operacion.categorias ?? 0) : null,
      detail: 'Catálogo global',
      icon: Tags,
      href: '/categorias',
      tone: 'text-purple-500',
    }] : []),
    ...(verInventario ? [{
      label: 'Inventario',
      value: operacion ? (operacion.inventario?.totalItems ?? 0) : null,
      detail: `${(operacion?.inventario?.alerta ?? 0) + (operacion?.inventario?.critico ?? 0)} con alerta`,
      icon: Boxes,
      href: '/inventario',
      tone: (operacion?.inventario?.critico ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500',
    }] : []),
    ...(verKardex ? [{
      label: 'Kardex',
      value: operacion ? (operacion.kardex?.totalMovimientos ?? 0) : null,
      detail: `${operacion?.kardex?.entradas ?? 0} ent · ${operacion?.kardex?.salidas ?? 0} sal`,
      icon: History,
      href: '/kardex',
      tone: 'text-sky-500',
    }] : []),
    ...(verCompras ? [{
      label: 'Compras',
      value: operacion ? (operacion.compras?.pendientes ?? 0) : null,
      detail: `${formatCurrency(operacion?.compras?.montoPendiente ?? 0)} pend.`,
      icon: Truck,
      href: '/compras',
      tone: 'text-orange-500',
    }] : []),
    ...(verAsistencia ? [{
      label: 'Asistencia',
      value: operacion
        ? operacion.asistencia
          ? `${operacion.asistencia.presente}/${operacion.asistencia.totalEmpleados}`
          : '0/0'
        : null,
      detail: `${operacion?.asistencia?.tardanza ?? 0} tard · ${operacion?.asistencia?.ausente ?? 0} aus`,
      icon: ClipboardCheck,
      href: '/asistencia',
      tone: 'text-emerald-500',
    }] : []),
    ...(verRoles ? [{
      label: 'Usuarios',
      value: roles !== null ? (totalUsuarios ?? 0) : null,
      detail: `${roles?.length ?? 0} roles activos`,
      icon: Users,
      href: '/usuarios',
      tone: 'text-foreground',
    }] : []),
    ...(verRoles ? [{
      label: 'Roles',
      value: roles !== null ? (roles.length) : null,
      detail: 'Niveles de acceso',
      icon: Shield,
      href: '/roles',
      tone: 'text-foreground',
    }] : []),
    ...(verSedes ? [{
      label: 'Sedes activas',
      value: sedes !== null ? (sedesActivas ?? 0) : null,
      detail: sedes !== null ? `de ${sedes.length} total` : '',
      icon: Building2,
      href: '/sucursales',
      tone: 'text-foreground',
    }] : []),
    {
      label: 'Sesiones',
      value: sesiones !== null ? sesiones.length : null,
      detail: 'Dispositivos conectados',
      icon: Monitor,
      href: '/perfil',
      tone: 'text-foreground',
    },
  ];

  const showCharts =
    (operacion !== null &&
      (verKardex || verInventario || verAsistencia || verCompras || verRoles)) ||
    (ventasChart !== null && ventasChart.length > 0);

  return (
    <div className="min-h-full space-y-5 p-4 lg:p-6">

      {/* ── Saludo ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground lg:text-2xl">
          {greeting()}, {user?.username ?? 'Usuario'}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {user ? getRoleLabel(user.rol) : ''}
          {user?.sede ? ` · ${user.sede}` : ' · Acceso global'}
        </p>
      </div>

      {/* ── Tarjetas compactas unificadas ── */}
      {allCards.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {allCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="surface group flex flex-col gap-0.5 px-3 py-2.5 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {card.label}
                </p>
                <card.icon
                  size={12}
                  className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </div>
              <p className={cn('font-mono text-base font-bold leading-tight', card.tone)}>
                {card.value === null ? '—' : card.value}
              </p>
              <p className="truncate text-[10px] text-muted-foreground leading-tight">
                {card.value === null ? '' : card.detail}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* ── Gráficas ── */}
      {showCharts && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Análisis visual</h2>
          <DashboardCharts
            kardexData={kardexChart}
            inventarioData={operacion?.inventario ?? null}
            asistenciaData={operacion?.asistencia ?? null}
            comprasData={operacion?.compras ?? null}
            rolesData={roles}
            totalUsuarios={totalUsuarios ?? 0}
            verKardex={verKardex}
            verInventario={verInventario}
            verAsistencia={verAsistencia}
            verCompras={verCompras}
            verRoles={verRoles}
            ventasChartData={ventasChart}
            ventasTotalHoy={ventasTotalHoy}
            ventasTotalMes={ventasTotalMes}
            ventasCountHoy={ventasCountHoy}
          />
        </section>
      )}

      {/* ── Sedes + Actividad reciente ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {verSedes && (
          <section className="surface p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Sedes</h2>
              <Link
                href="/sucursales"
                className="flex items-center gap-1 text-xs font-medium text-primary-text hover:underline"
              >
                Gestionar <ArrowRight size={12} />
              </Link>
            </div>
            <Bones name="dashboard-sedes" loading={sedes === null} placeholder={<BoneList rows={4} />}>
              {sedes !== null && sedes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay sedes registradas.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(sedes ?? []).slice(0, 6).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{s.nombre}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.direccion ?? 'Sin dirección'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {s._count.usuarios}
                        </span>
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            s.activo ? 'bg-success' : 'bg-muted-foreground',
                          )}
                          title={s.activo ? 'Activa' : 'Inactiva'}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Bones>
          </section>
        )}

        {verAudit && (
          <section className="surface p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ScrollText size={13} className="text-muted-foreground" />
                Actividad reciente
              </h2>
              <Link
                href="/auditoria"
                className="flex items-center gap-1 text-xs font-medium text-primary-text hover:underline"
              >
                Ver todo <ArrowRight size={12} />
              </Link>
            </div>
            <Bones
              name="dashboard-actividad"
              loading={logs === null}
              placeholder={<BoneList rows={6} avatar />}
            >
              {logs !== null && logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(logs ?? []).map((log) => (
                    <li key={log.id} className="flex items-start gap-3 py-2 text-sm">
                      <span
                        className={cn(
                          'mt-1.5 size-1.5 shrink-0 rounded-full bg-current',
                          accionTone(log.accion),
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <span className={cn('font-medium', accionTone(log.accion))}>
                          {log.accion}
                        </span>
                        {log.entidad && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {log.entidad}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {log.usuario?.username ?? '—'}
                      </span>
                      <span className="hidden shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground sm:block">
                        {dateFmt.format(new Date(log.createdAt))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Bones>
          </section>
        )}
      </div>

      {/* ── Portada mínima para roles sin módulos ── */}
      {allCards.length === 0 && !verAudit && (
        <section className="surface p-6">
          <h2 className="text-sm font-semibold text-foreground">Tu cuenta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu rol no tiene módulos asignados. Desde{' '}
            <Link href="/perfil" className="text-primary-text hover:underline">
              tu perfil
            </Link>{' '}
            puedes cambiar la contraseña y revisar tus sesiones activas.
          </p>
        </section>
      )}
    </div>
  );
}
