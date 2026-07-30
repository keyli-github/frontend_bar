'use client';

/**
 * Registro de auditoria — `AuditController`.
 *
 *   GET /api/audit?accion&usuarioId&entidad&desde&hasta&pagina&limite
 *
 * Requiere el permiso `audit:leer`. Un ADMIN solo recibe los registros de su
 * sede; el filtrado lo aplica el servidor, no el cliente.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Pagination } from '@/components/shared/pagination';
import { useAuthStore } from '@/store/auth-store';
import { auditApi, ApiError } from '@/lib/api';
import { hasPermission } from '@/lib/roles';
import type { AuditLog, AuditQuery } from '@/types/api';
import { Filter, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bones, BoneTable } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';

const PAGE_SIZE = 25;

const dateFmt = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none';
const labelClass = 'text-[11px] uppercase tracking-wider text-muted-foreground';

/** Colores por familia de accion, para escanear la tabla de un vistazo. */
function accionTone(accion: string): string {
  if (accion.includes('ELIMINAR') || accion.includes('BLOQUEADA') || accion.includes('REUSO'))
    return 'border-destructive/25 bg-destructive/10 text-destructive';
  if (accion.includes('CREAR')) return 'border-success/25 bg-success/10 text-success';
  if (accion.includes('LOGIN')) return 'border-primary/25 bg-primary/10 text-primary-text';
  return 'border-border bg-muted/60 text-muted-foreground';
}

export default function AuditoriaPage() {
  const permisos = useAuthStore((s) => s.permisos);
  const boneyardBuild = useBoneyardBuild();
  const puedeLeer = boneyardBuild || hasPermission(permisos, 'audit:leer');

  // Borrador del formulario (no dispara peticiones hasta pulsar "Aplicar").
  const [draft, setDraft] = useState({ accion: '', entidad: '', desde: '', hasta: '' });
  // Filtros efectivamente aplicados.
  const [filtros, setFiltros] = useState<AuditQuery>({});
  const [pagina, setPagina] = useState(1);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  /**
   * Contador que garantiza que el efecto se reejecuta.
   *
   * Sin el, pulsar "Limpiar" estando ya en pagina 1 sin filtros ponia
   * `loading = true` pero no cambiaba ninguna dependencia, asi que el fetch
   * nunca se lanzaba y la tabla se quedaba en "Cargando..." indefinidamente.
   */
  const [reloadToken, setReloadToken] = useState(0);

  /** Serializado para usarlo como dependencia estable del efecto. */
  const filtrosKey = useMemo(() => JSON.stringify(filtros), [filtros]);

  useEffect(() => {
    let cancelled = false;
    const query: AuditQuery = { ...(JSON.parse(filtrosKey) as AuditQuery), pagina, limite: PAGE_SIZE };

    auditApi
      .listAuditLogs(query)
      .then((res) => {
        if (cancelled) return;
        setLogs(res.data);
        setTotal(res.total);
        setTotalPaginas(res.totalPaginas || 1);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof ApiError ? e.message : 'No se pudo cargar la auditoría.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filtrosKey, pagina, reloadToken]);

  const aplicar = useCallback(() => {
    const next: AuditQuery = {};
    if (draft.accion.trim()) next.accion = draft.accion.trim();
    if (draft.entidad.trim()) next.entidad = draft.entidad.trim();
    // El backend valida con @IsDateString: se envia ISO completo.
    // El limite superior es .999 para no perder los eventos del ultimo segundo.
    if (draft.desde) next.desde = new Date(`${draft.desde}T00:00:00.000`).toISOString();
    if (draft.hasta) next.hasta = new Date(`${draft.hasta}T23:59:59.999`).toISOString();
    setLoading(true);
    setPagina(1);
    setFiltros(next);
    setReloadToken((n) => n + 1);
  }, [draft]);

  const limpiar = useCallback(() => {
    setDraft({ accion: '', entidad: '', desde: '', hasta: '' });
    setLoading(true);
    setPagina(1);
    setFiltros({});
    setReloadToken((n) => n + 1);
  }, []);

  const irAPagina = useCallback((p: number) => {
    setLoading(true);
    setPagina(p);
  }, []);

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
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} registro{total === 1 ? '' : 's'} en tu ámbito
        </p>
      </div>

      {/* ── Filtros (servidor) ── */}
      <div className="surface animate-fade-in-up p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="f-accion" className={labelClass}>
              Acción
            </label>
            <input
              id="f-accion"
              value={draft.accion}
              onChange={(e) => setDraft({ ...draft, accion: e.target.value.toUpperCase() })}
              placeholder="LOGIN_EXITOSO"
              className={cn(inputClass, 'mt-1.5')}
            />
          </div>
          <div>
            <label htmlFor="f-entidad" className={labelClass}>
              Entidad
            </label>
            <input
              id="f-entidad"
              value={draft.entidad}
              onChange={(e) => setDraft({ ...draft, entidad: e.target.value })}
              placeholder="Usuario"
              className={cn(inputClass, 'mt-1.5')}
            />
          </div>
          <div>
            <label htmlFor="f-desde" className={labelClass}>
              Desde
            </label>
            <input
              id="f-desde"
              type="date"
              value={draft.desde}
              onChange={(e) => setDraft({ ...draft, desde: e.target.value })}
              className={cn(inputClass, 'mt-1.5')}
            />
          </div>
          <div>
            <label htmlFor="f-hasta" className={labelClass}>
              Hasta
            </label>
            <input
              id="f-hasta"
              type="date"
              value={draft.hasta}
              onChange={(e) => setDraft({ ...draft, hasta: e.target.value })}
              className={cn(inputClass, 'mt-1.5')}
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={aplicar}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Filter size={14} /> Aplicar
          </button>
          <button
            type="button"
            onClick={limpiar}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw size={14} /> Limpiar
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ── Tabla ── */}
      <div className="surface animate-fade-in-up overflow-hidden">
        <Bones
          name="auditoria-tabla"
          loading={loading}
          placeholder={<BoneTable rows={10} cols={5} />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['', 'Fecha', 'Acción', 'Usuario', 'Entidad', 'IP'].map((h, i) => (
                    <th
                      key={h || i}
                      className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No hay registros para estos filtros.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const abierto = expandido === log.id;
                  const tieneDetalle = log.detalle != null;
                  return (
                    <Fragment key={log.id}>
                      <tr className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3">
                          {tieneDetalle && (
                            <button
                              type="button"
                              onClick={() => setExpandido(abierto ? null : log.id)}
                              aria-expanded={abierto}
                              aria-label={abierto ? 'Ocultar detalle' : 'Ver detalle'}
                              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                          {dateFmt.format(new Date(log.createdAt))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded border px-2 py-0.5 text-[10px] font-bold',
                              accionTone(log.accion),
                            )}
                          >
                            {log.accion}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {log.usuario ? (
                            <span className="font-mono text-xs">{log.usuario.username}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {log.entidad ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {log.ip ?? '—'}
                        </td>
                      </tr>
                      {abierto && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="overflow-x-auto rounded-lg border border-border bg-card p-3 font-mono text-[11px] text-muted-foreground">
                              {JSON.stringify(log.detalle, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </Bones>

        <Pagination
          page={pagina}
          totalPages={totalPaginas}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={irAPagina}
          className="border-t border-border px-3"
        />
      </div>
    </div>
  );
}
