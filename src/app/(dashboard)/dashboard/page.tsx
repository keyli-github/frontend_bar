'use client';

/**
 * Dashboard.
 *
 * Todo lo que se pinta aqui sale de la API; no hay datos simulados. Cada
 * bloque se carga solo si el JWT trae el permiso correspondiente, de modo que
 * un CAJERO ve una portada minima en lugar de tarjetas vacias o errores 403.
 *
 * Fuentes:
 *   GET /api/roles          -> usuarios por rol   (roles:leer)
 *   GET /api/establecimientos -> sedes            (establecimientos:leer)
 *   GET /api/audit          -> actividad reciente (audit:leer)
 *   GET /api/auth/sesiones  -> dispositivos propios
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { rolesApi, establecimientosApi, auditApi, authApi } from '@/lib/api';
import { getRoleLabel, hasPermission } from '@/lib/roles';
import type { AuditLog, Establecimiento, Rol, SessionInfo } from '@/types/api';
import { Users, Building2, ScrollText, Shield, Monitor, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bones, BoneBars, BoneKpis, BoneList } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';

const dateFmt = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'short',
});

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

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const permisos = useAuthStore((s) => s.permisos);
  const boneyardBuild = useBoneyardBuild();

  const verRoles = boneyardBuild || hasPermission(permisos, 'roles:leer');
  const verSedes =
    boneyardBuild || hasPermission(permisos, 'establecimientos:leer');
  const verAudit = boneyardBuild || hasPermission(permisos, 'audit:leer');

  const [roles, setRoles] = useState<Rol[] | null>(null);
  const [sedes, setSedes] = useState<Establecimiento[] | null>(null);
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [sesiones, setSesiones] = useState<SessionInfo[] | null>(null);

  // Cada bloque se pide solo si hay permiso; los fallos se degradan a `[]`
  // para que una seccion caida no tumbe la portada entera.
  useEffect(() => {
    let cancelled = false;
    if (!verRoles) return;
    rolesApi
      .listRoles({ limite: 100 })
      .then((d) => !cancelled && setRoles(d.data))
      .catch(() => !cancelled && setRoles([]));
    return () => {
      cancelled = true;
    };
  }, [verRoles]);

  useEffect(() => {
    let cancelled = false;
    if (!verSedes) return;
    establecimientosApi
      .listEstablecimientos({ limite: 100 })
      .then((d) => !cancelled && setSedes(d.data))
      .catch(() => !cancelled && setSedes([]));
    return () => {
      cancelled = true;
    };
  }, [verSedes]);

  useEffect(() => {
    let cancelled = false;
    if (!verAudit) return;
    auditApi
      .listAuditLogs({ pagina: 1, limite: 8 })
      .then((d) => !cancelled && setLogs(d.data))
      .catch(() => !cancelled && setLogs([]));
    return () => {
      cancelled = true;
    };
  }, [verAudit]);

  useEffect(() => {
    let cancelled = false;
    authApi
      .getSesiones()
      .then((d) => !cancelled && setSesiones(d))
      .catch(() => !cancelled && setSesiones([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUsuarios = roles?.reduce((n, r) => n + r._count.usuarios, 0) ?? null;
  const sedesActivas = sedes?.filter((s) => s.activo).length ?? null;

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

  // Cada bloque espera solo a su propia fuente, para que la portada aparezca
  // por partes en lugar de bloquearse hasta la peticion mas lenta.
  const kpisCargando =
    sesiones === null ||
    (verRoles && roles === null) ||
    (verSedes && sedes === null);

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* ── Saludo ── */}
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-bold text-foreground lg:text-2xl">
          {greeting()}, {user?.username ?? 'Usuario'} 👋
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {user ? getRoleLabel(user.rol) : ''}
          {user?.sede ? ` · ${user.sede}` : ' · Acceso global'}
        </p>
      </div>

      {/* ── KPIs ── */}
      <Bones
        name="dashboard-kpis"
        loading={kpisCargando}
        placeholder={<BoneKpis count={kpis.length || 4} />}
      >
        <div className="grid grid-cols-2 gap-3 stagger-children lg:grid-cols-4">
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

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Usuarios por rol ── */}
        {verRoles && (
          <section className="surface animate-fade-in-up p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Usuarios por rol</h2>
              <Link
                href="/roles"
                className="flex items-center gap-1 text-xs font-medium text-primary-text hover:underline"
              >
                Ver roles <ArrowRight size={12} />
              </Link>
            </div>

            <Bones
              name="dashboard-roles"
              loading={roles === null}
              placeholder={<BoneBars rows={5} />}
            >
              {roles !== null && roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <ul className="space-y-2.5">
                  {[...(roles ?? [])]
                  .sort((a, b) => b._count.usuarios - a._count.usuarios)
                  .map((r) => {
                    const pct = totalUsuarios
                      ? Math.round((r._count.usuarios / totalUsuarios) * 100)
                      : 0;
                    return (
                      <li key={r.id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-foreground">
                            {getRoleLabel(r.nombre)}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {r._count.usuarios}
                          </span>
                        </div>
                        <div
                          className="h-1.5 overflow-hidden rounded-full bg-muted"
                          role="presentation"
                        >
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Bones>
          </section>
        )}

        {/* ── Sedes ── */}
        {verSedes && (
          <section className="surface animate-fade-in-up p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Sedes</h2>
              <Link
                href="/sucursales"
                className="flex items-center gap-1 text-xs font-medium text-primary-text hover:underline"
              >
                Gestionar <ArrowRight size={12} />
              </Link>
            </div>

            <Bones
              name="dashboard-sedes"
              loading={sedes === null}
              placeholder={<BoneList rows={4} />}
            >
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
      </div>

      {/* ── Actividad reciente ── */}
      {verAudit && (
        <section className="surface animate-fade-in-up p-5">
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
                    className={cn('mt-1.5 size-1.5 shrink-0 rounded-full bg-current', accionTone(log.accion))}
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

      {/* ── Portada minima para roles operativos ── */}
      {!verRoles && !verSedes && !verAudit && (
        <section className="surface animate-fade-in-up p-6">
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
