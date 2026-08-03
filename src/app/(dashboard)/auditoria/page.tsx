'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Database,
  Eye,
  Globe,
  LogIn,
  MapPin,
  Monitor,
  RotateCcw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Bone, Bones, BoneKpis, BoneTable } from '@/components/shared/bones';
import { DatePicker } from '@/components/shared/date-picker';
import { ModalShell } from '@/components/shared/modal-shell';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SearchBar } from '@/components/shared/search-bar';
import { StatCard } from '@/components/shared/stat-card';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { ApiError, auditApi } from '@/lib/api';
import { hasPermission } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { AuditLog, AuditQuery } from '@/types/api';

const PAGE_SIZE = 25;

const dateFmt = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

const actionStyles = {
  access: 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  create: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  update: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400',
  neutral: 'border-border bg-muted text-muted-foreground',
};

function getActionStyle(action: string) {
  if (action.includes('LOGIN')) return actionStyles.access;
  if (action.includes('CREAR') || action.includes('ASIGNAR')) return actionStyles.create;
  if (action.includes('EDITAR') || action.includes('CAMBIAR')) return actionStyles.update;
  if (
    action.includes('ELIMINAR') ||
    action.includes('DESACTIVAR') ||
    action.includes('BLOQUEADA') ||
    action.includes('RESETEAR') ||
    action.includes('REUSO')
  ) {
    return actionStyles.danger;
  }
  return actionStyles.neutral;
}

function formatAction(action: string) {
  return action.replaceAll('_', ' ');
}

/**
 * En desarrollo el backend registra la IP de loopback (`::1` en IPv6,
 * `127.0.0.1` en IPv4), porque cliente y servidor viven en la misma maquina.
 * Node ademas antepone `::ffff:` a las IPv4 mapeadas. Se traduce a algo legible.
 */
function formatIp(ip: string | null | undefined, fallback: string) {
  if (!ip) return fallback;
  const clean = ip.replace(/^::ffff:/i, '');
  if (clean === '::1' || clean === '127.0.0.1') return 'Local (este equipo)';
  return clean;
}

function toApiDate(date: Date, endOfDay = false) {
  const value = new Date(date);
  value.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return value.toISOString();
}

export default function AuditoriaPage() {
  const permisos = useAuthStore((state) => state.permisos);
  const boneyardBuild = useBoneyardBuild();
  const puedeLeer = boneyardBuild || hasPermission(permisos, 'audit:leer');

  const [actionDraft, setActionDraft] = useState('');
  const [entityDraft, setEntityDraft] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [filters, setFilters] = useState<AuditQuery>({});
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditLog | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    let cancelled = false;
    const query: AuditQuery = {
      ...(JSON.parse(filtersKey) as AuditQuery),
      pagina: page,
      limite: PAGE_SIZE,
    };

    auditApi
      .listAuditLogs(query)
      .then((result) => {
        if (cancelled) return;
        setLogs(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPaginas || 1);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'No se pudo cargar la auditoría.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filtersKey, page, reloadToken]);

  const applyFilters = useCallback(() => {
    const next: AuditQuery = {};
    if (actionDraft.trim()) next.accion = actionDraft.trim().toUpperCase();
    if (entityDraft.trim()) next.entidad = entityDraft.trim();
    if (dateFrom) next.desde = toApiDate(dateFrom);
    if (dateTo) next.hasta = toApiDate(dateTo, true);
    setLoading(true);
    setPage(1);
    setFilters(next);
    setReloadToken((value) => value + 1);
  }, [actionDraft, dateFrom, dateTo, entityDraft]);

  const clearFilters = useCallback(() => {
    setActionDraft('');
    setEntityDraft('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setLoading(true);
    setPage(1);
    setFilters({});
    setReloadToken((value) => value + 1);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  }, []);

  const pageStats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      today: logs.filter((log) => new Date(log.createdAt).toDateString() === today).length,
      access: logs.filter(
        (log) => log.accion.includes('LOGIN') || log.accion.includes('CUENTA_BLOQUEADA'),
      ).length,
      critical: logs.filter(
        (log) =>
          log.accion.includes('ELIMINAR') ||
          log.accion.includes('DESACTIVAR') ||
          log.accion.includes('CUENTA_BLOQUEADA'),
      ).length,
    };
  }, [logs]);

  if (!puedeLeer) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          No tienes permiso para ver el registro de auditoría.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
<main className="space-y-4 p-3 sm:p-4 lg:space-y-5 lg:p-6">
        <PageHeader
          title="Registro de auditoría"
          subtitle="Trazabilidad de accesos y cambios administrativos del sistema"
          badge={(
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              EN LÍNEA
            </span>
          )}
        />

        <Bones name="auditoria-kpis" loading={loading} placeholder={<BoneKpis count={4} />}>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Eventos registrados"
            value={String(total)}
            subtitle="En tu ámbito"
            icon={<Activity size={15} />}
          />
          <StatCard
            label="Actividad hoy"
            value={String(pageStats.today)}
            subtitle="Página actual"
            icon={<CalendarDays size={15} />}
            valueColor="text-amber-500"
          />
          <StatCard
            label="Accesos"
            value={String(pageStats.access)}
            subtitle="Página actual"
            icon={<LogIn size={15} />}
            valueColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Eventos críticos"
            value={String(pageStats.critical)}
            subtitle="Página actual"
            icon={<AlertTriangle size={15} />}
            valueColor="text-red-600 dark:text-red-400"
          />
        </section>
        </Bones>

        <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Acción
              </label>
              <SearchBar
                value={actionDraft}
                onChange={setActionDraft}
                placeholder="Ej. LOGIN_EXITOSO"
              />
            </div>

            <label className="block min-w-0 xl:w-52">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Entidad
              </span>
              <input
                value={entityDraft}
                onChange={(event) => setEntityDraft(event.target.value)}
                placeholder="Ej. Usuario"
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-amber-500/40 focus:border-amber-500/60"
              />
            </label>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <CalendarDays size={12} /> Rango de fechas
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Desde" />
                <span className="hidden h-px w-3 bg-border sm:block" />
                <DatePicker value={dateTo} onChange={setDateTo} placeholder="Hasta" />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="flex h-9 items-center justify-center rounded-lg bg-amber-500 px-4 text-xs font-bold text-black transition-colors hover:bg-amber-400"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Limpiar filtros"
              >
                <RotateCcw size={14} />
                <span className="xl:hidden">Limpiar</span>
              </button>
            </div>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-1 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Historial de actividad</h2>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {loading ? <Bone className="h-3 w-52" /> : <>{total} {total === 1 ? 'evento coincide' : 'eventos coinciden'} con la consulta</>}
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:mt-0">
              <ShieldCheck size={13} className="text-emerald-500" />
              Registro inmutable
            </div>
          </div>

          <Bones
            name="auditoria-tabla"
            loading={loading}
            placeholder={<BoneTable rows={10} cols={7} />}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {['Fecha y hora', 'Acción', 'Usuario', 'Entidad', 'Origen', 'Sede', ''].map(
                      (header) => (
                        <th
                          key={header || 'actions'}
                          className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="group transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-mono text-xs font-medium text-foreground">
                          {dateFmt.format(new Date(log.createdAt))}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[9px] font-bold tracking-wide',
                            getActionStyle(log.accion),
                          )}
                        >
                          {formatAction(log.accion)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.usuario ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                              {log.usuario.username.slice(0, 2)}
                            </span>
                            <span className="font-medium text-foreground">{log.usuario.username}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{log.entidad ?? 'Sin entidad'}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {log.entidadId ? `ID: ${log.entidadId}` : 'Sin ID asociado'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-mono text-xs text-foreground">{formatIp(log.ip, 'Sin IP')}</p>
                        <p className="mt-0.5 max-w-40 truncate text-[10px] text-muted-foreground">
                          {log.userAgent ?? 'User-agent no disponible'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                        {log.sedeId ?? 'Global'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(log)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
                        >
                          <Eye size={13} /> Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {logs.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Database size={19} />
                </div>
                <p className="text-sm font-semibold text-foreground">No se encontraron eventos</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Prueba con otros filtros o limpia la consulta.
                </p>
              </div>
            )}
          </Bones>

          <div className="border-t border-border px-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={goToPage}
            />
          </div>
        </section>
      </main>

      <ModalShell
        open={Boolean(selectedEvent)}
        title="Detalle del evento"
        subtitle={selectedEvent ? `Registro ${selectedEvent.id}` : undefined}
        onClose={() => setSelectedEvent(null)}
        className="max-w-2xl"
      >
        {selectedEvent && <AuditEventDetail event={selectedEvent} />}
      </ModalShell>
    </div>
  );
}

function AuditEventDetail({ event }: { event: AuditLog }) {
  const detailFields = [
    { label: 'Usuario', value: event.usuario?.username ?? 'Sistema', icon: <User size={14} /> },
    { label: 'Sede', value: event.sedeId ?? 'Ámbito global', icon: <MapPin size={14} /> },
    { label: 'Dirección IP', value: formatIp(event.ip, 'No disponible'), icon: <Globe size={14} /> },
    { label: 'User-agent', value: event.userAgent ?? 'No disponible', icon: <Monitor size={14} /> },
  ];

  // Acciones como LOGIN_EXITOSO no registran `detalle`; otras guardan un objeto
  // (p. ej. `{ cambios: [...] }`). Solo se muestra el bloque JSON si hay algo.
  const detalle = event.detalle as unknown;
  const hasDetalle =
    detalle != null &&
    !(typeof detalle === 'object' && Object.keys(detalle).length === 0);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Acción registrada
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-wide',
              getActionStyle(event.accion),
            )}
          >
            {formatAction(event.accion)}
          </span>
          <span className="text-xs text-muted-foreground">
            {dateFmt.format(new Date(event.createdAt))}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {detailFields.map((field) => (
          <div key={field.label} className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {field.icon} {field.label}
            </div>
            <p className="mt-2 break-words text-sm font-medium text-foreground">{field.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Database size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Entidad afectada
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{event.entidad ?? 'Sin entidad'}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {event.entidadId ? `Identificador: ${event.entidadId}` : 'Evento sin identificador de entidad'}
            </p>
          </div>
        </div>
      </div>

      {hasDetalle ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              JSON detalle
            </p>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
              application/json
            </span>
          </div>
          <pre className="max-h-56 overflow-auto rounded-xl border border-border bg-zinc-950 p-4 font-mono text-xs leading-5 text-emerald-300 shadow-inner">
            {JSON.stringify(event.detalle, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-center text-xs text-muted-foreground">
          Este evento no registró detalle adicional.
        </p>
      )}
    </div>
  );
}
