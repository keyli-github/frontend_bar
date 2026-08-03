'use client';

/**
 * Dashboard.
 *
 * Todo lo que se pinta aqui sale de la API; no hay datos simulados. Cada
 * bloque se carga solo si el JWT trae el permiso correspondiente, de modo que
 * un CAJERO ve una portada minima en lugar de tarjetas vacias o errores 403.
 *
 * Fuentes:
 *   GET /api/caja/actual         -> estado y saldo de caja
 *   GET /api/categorias          -> total de categorias
 *   GET /api/productos/resumen   -> KPIs del catalogo
 *   GET /api/inventario/resumen  -> stock y alertas
 *   GET /api/kardex/resumen      -> movimientos de stock
 *   GET /api/kardex?desde&hasta  -> datos para grafica de area (7 dias)
 *   GET /api/compras/resumen     -> ordenes y monto pendiente
 *   GET /api/asistencia/resumen  -> asistencia del dia
 *   GET /api/roles               -> usuarios por rol   (roles:leer)
 *   GET /api/establecimientos    -> sedes              (establecimientos:leer)
 *   GET /api/audit               -> actividad reciente (audit:leer)
 *   GET /api/auth/sesiones       -> dispositivos propios
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
import type { KardexChartPoint } from './_charts';
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
import { Bones, BoneKpis, BoneList } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';

// ─── Import dinámico de gráficas ──────────────────────────────────────────────
// recharts usa APIs del DOM (SVG, ResizeObserver) que no existen en el servidor,
// así que el bundle se carga solo en el cliente.
const DashboardCharts = dynamic(() => import('./_charts'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="surface h-[290px] animate-pulse" />
        <div className="surface h-[290px] animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface h-[240px] animate-pulse" />
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
  if (accion.includes('ELIMINAR') || accion.includes('BLOQUEADA') || accion.includes('REUSO'))
    return 'text-destructive';
  if (accion.includes('CREAR')) return 'text-success';
  return 'text-muted-foreground';
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

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const permisos = useAuthStore((s) => s.permisos);
  const boneyardBuild = useBoneyardBuild();

  const verRoles     = boneyardBuild || hasPermission(permisos, 'roles:leer');
  const verSedes     = boneyardBuild || hasPermission(permisos, 'establecimientos:leer');
  const verAudit     = boneyardBuild || hasPermission(permisos, 'audit:leer');
  const verCategorias = boneyardBuild || hasPermission(permisos, 'categorias:leer');
  const verProductos  = boneyardBuild || hasPermission(permisos, 'productos:leer');
  const verInventario = boneyardBuild || hasPermission(permisos, 'inventario:leer');
  const verKardex    = boneyardBuild || hasPermission(permisos, 'kardex:leer');
  const verCompras   = boneyardBuild || hasPermission(permisos, 'compras:leer');
  const verAsistencia = boneyardBuild || hasPermission(permisos, 'asistencia:leer');
  const verCaja      = boneyardBuild || hasPermission(permisos, 'caja:leer');

  // ── Estado ────────────────────────────────────────────────────────────────
  const [roles, setRoles]     = useState<Rol[] | null>(null);
  const [sedes, setSedes]     = useState<Establecimiento[] | null>(null);
  const [logs, setLogs]       = useState<AuditLog[] | null>(null);
  const [sesiones, setSesiones] = useState<SessionInfo[] | null>(null);
  const [operacion, setOperacion] = useState<OperationalData | null>(null);

  // Estado para los datos de la gráfica de área (kardex 7 días)
  const [kardexChart, setKardexChart] = useState<KardexChartPoint[] | null>(null);

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

  // Datos operativos (sin kardex chart)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadOptional(verCategorias, () =>
        categoriasApi.listCategorias({ pagina: 1, limite: 1 }).then((r) => r.total),
      ),
      loadOptional(verProductos, productosApi.getProductosResumen),
      loadOptional(verInventario, () => inventarioApi.getInventarioResumen()),
      loadOptional(verKardex, () => kardexApi.getKardexResumen()),
      loadOptional(verCompras, () => comprasApi.getComprasResumen()),
      loadOptional(verAsistencia, () => asistenciaApi.getAsistenciaResumen()),
      loadOptional(verCaja && Boolean(user?.sedeId), () =>
        cajaApi.getCajaActual(user?.sedeId ?? undefined),
      ),
    ]).then(([categorias, productos, inventario, kardex, compras, asistencia, caja]) => {
      if (cancelled) return;
      setOperacion({ categorias, productos, inventario, kardex, compras, asistencia, caja });
    });
    return () => { cancelled = true; };
  }, [
    user?.sedeId,
    verAsistencia,
    verCaja,
    verCategorias,
    verCompras,
    verInventario,
    verKardex,
    verProductos,
  ]);

  // Kardex chart: movimientos de los últimos 7 días agrupados por fecha y tipo
  useEffect(() => {
    if (!verKardex) return;   // sin permiso → kardexChart queda en null (no se renderiza)
    let cancelled = false;

    const today = new Date();
    const desde = new Date(today);
    desde.setDate(desde.getDate() - 6);
    const desdeStr = desde.toISOString().split('T')[0];
    const hastaStr = today.toISOString().split('T')[0];

    // Construir array de 7 días con fechas ISO
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    kardexApi
      .listKardex({ desde: desdeStr, hasta: hastaStr, limite: 100 })
      .then((result) => {
        if (cancelled) return;

        const byDay: Record<string, { Entradas: number; Salidas: number }> = {};
        days.forEach((d) => { byDay[d] = { Entradas: 0, Salidas: 0 }; });

        for (const mov of result.data) {
          const day = mov.fecha; // 'YYYY-MM-DD'
          if (byDay[day]) {
            if (mov.tipo === 'ENTRADA') byDay[day].Entradas++;
            else if (mov.tipo === 'SALIDA') byDay[day].Salidas++;
          }
        }

        const chartData: KardexChartPoint[] = days.map((day) => ({
          dia: DAY_NAMES[new Date(`${day}T12:00:00`).getDay()],
          Entradas: byDay[day].Entradas,
          Salidas: byDay[day].Salidas,
        }));

        setKardexChart(chartData);
      })
      .catch(() => {
        if (!cancelled) setKardexChart([]);
      });

    return () => { cancelled = true; };
  }, [verKardex]);

  // ── Derivados ─────────────────────────────────────────────────────────────

  const totalUsuarios = roles?.reduce((n, r) => n + r._count.usuarios, 0) ?? null;
  const sedesActivas  = sedes?.filter((s) => s.activo).length ?? null;

  const kpis = [
    verRoles && {
      label: 'Usuarios',
      value: totalUsuarios,
      icon: Users,
      href: '/usuarios',
    },
    verRoles && {
      label: 'Roles',
      value: roles?.length ?? null,
      icon: Shield,
      href: '/roles',
    },
    verSedes && {
      label: 'Sedes activas',
      value: sedesActivas,
      icon: Building2,
      href: '/sucursales',
    },
    {
      label: 'Sesiones activas',
      value: sesiones?.length ?? null,
      icon: Monitor,
      href: '/perfil',
    },
  ].filter(Boolean) as {
    label: string;
    value: number | null;
    icon: React.ElementType;
    href: string;
  }[];

  const kpisCargando =
    sesiones === null ||
    (verRoles && roles === null) ||
    (verSedes && sedes === null);

  const operationalCards = [
    verCaja && {
      label: 'Caja',
      value: operacion?.caja
        ? formatCurrency(operacion.caja.resumen.saldoEsperado)
        : user?.sedeId
          ? 'Cerrada'
          : 'Por sede',
      detail: operacion?.caja
        ? `${formatCurrency(operacion.caja.resumen.totalEntradas)} en entradas`
        : user?.sedeId
          ? 'Sin turno abierto'
          : 'Selecciona una sede en Caja',
      icon: Landmark,
      href: '/caja',
      tone: operacion?.caja ? 'text-emerald-500' : 'text-muted-foreground',
    },
    verProductos && {
      label: 'Productos',
      value: operacion?.productos?.total ?? '—',
      detail: `${operacion?.productos?.activos ?? 0} activos`,
      icon: Package,
      href: '/productos',
      tone: 'text-amber-500',
    },
    verCategorias && {
      label: 'Categorías',
      value: operacion?.categorias ?? '—',
      detail: 'Catálogo global',
      icon: Tags,
      href: '/categorias',
      tone: 'text-purple-500',
    },
    verInventario && {
      label: 'Inventario',
      value: operacion?.inventario?.totalItems ?? '—',
      detail: `${(operacion?.inventario?.alerta ?? 0) + (operacion?.inventario?.critico ?? 0)} con alerta`,
      icon: Boxes,
      href: '/inventario',
      tone:
        (operacion?.inventario?.critico ?? 0) > 0
          ? 'text-red-500'
          : 'text-emerald-500',
    },
    verKardex && {
      label: 'Kardex',
      value: operacion?.kardex?.totalMovimientos ?? '—',
      detail: `${operacion?.kardex?.entradas ?? 0} entradas · ${operacion?.kardex?.salidas ?? 0} salidas`,
      icon: History,
      href: '/kardex',
      tone: 'text-sky-500',
    },
    verCompras && {
      label: 'Compras',
      value: operacion?.compras?.pendientes ?? '—',
      detail: `${formatCurrency(operacion?.compras?.montoPendiente ?? 0)} pendiente`,
      icon: Truck,
      href: '/compras',
      tone: 'text-orange-500',
    },
    verAsistencia && {
      label: 'Asistencia',
      value: operacion?.asistencia
        ? `${operacion.asistencia.presente}/${operacion.asistencia.totalEmpleados}`
        : '—',
      detail: `${operacion?.asistencia?.tardanza ?? 0} tardanzas · ${operacion?.asistencia?.ausente ?? 0} ausentes`,
      icon: ClipboardCheck,
      href: '/asistencia',
      tone: 'text-emerald-500',
    },
  ].filter(Boolean) as Array<{
    label: string;
    value: string | number;
    detail: string;
    icon: React.ElementType;
    href: string;
    tone: string;
  }>;

  // Determina si hay al menos una gráfica para mostrar
  const chartsReady =
    kardexChart !== null ||
    operacion !== null;

  const showCharts =
    chartsReady &&
    (verKardex || verInventario || verAsistencia || verCompras || verRoles);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* ── Saludo ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground lg:text-2xl">
          {greeting()}, {user?.username ?? 'Usuario'} 👋
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {user ? getRoleLabel(user.rol) : ''}
          {user?.sede ? ` · ${user.sede}` : ' · Acceso global'}
        </p>
      </div>

      {/* ── KPIs operativos ── */}
      {operationalCards.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Resumen operativo</h2>
            <p className="text-xs text-muted-foreground">
              Información real de los módulos habilitados para tu rol.
            </p>
          </div>
          <Bones
            name="dashboard-operacion"
            loading={operacion === null}
            placeholder={<BoneKpis count={Math.min(operationalCards.length, 4)} />}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {operationalCards.map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className="surface group p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {card.label}
                      </p>
                      <p className={cn('mt-1 truncate font-mono text-lg font-bold lg:text-xl', card.tone)}>
                        {card.value}
                      </p>
                    </div>
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                      <card.icon size={17} />
                    </span>
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">{card.detail}</p>
                </Link>
              ))}
            </div>
          </Bones>
        </section>
      )}

      {/* ── Gráficas con datos reales ── */}
      {showCharts && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Análisis visual</h2>
            <p className="text-xs text-muted-foreground">
              Tendencias e indicadores de los módulos activos.
            </p>
          </div>
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
          />
        </section>
      )}

      {/* ── KPIs administrativos ── */}
      {kpis.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Administración y cuenta</h2>
          <Bones
            name="dashboard-kpis"
            loading={kpisCargando}
            placeholder={<BoneKpis count={kpis.length || 4} />}
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpis.map((k) => (
                <Link
                  key={k.label}
                  href={k.href}
                  className="surface group px-4 py-3 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {k.label}
                    </p>
                    <k.icon size={14} className="text-muted-foreground" />
                  </div>
                  <p className="mt-1 font-mono text-lg font-bold text-foreground lg:text-xl">
                    {k.value ?? '—'}
                  </p>
                </Link>
              ))}
            </div>
          </Bones>
        </section>
      )}

      {/* ── Sedes + Actividad reciente ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {verSedes && (
          <section className="surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Sedes</h2>
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
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
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
          <section className="surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <ScrollText size={15} className="text-muted-foreground" /> Actividad reciente
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
                          <span className="ml-2 text-xs text-muted-foreground">{log.entidad}</span>
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
      {!verRoles && !verSedes && !verAudit && operationalCards.length === 0 && (
        <section className="surface p-6">
          <h2 className="text-base font-semibold text-foreground">Tu cuenta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu rol no tiene módulos de administración asignados. Desde{' '}
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
