'use client';

/** Asistencia del personal, conectada a AsistenciaController. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Pagination } from '@/components/shared/pagination';
import { ModalShell } from '@/components/shared/modal-shell';
import { Bones, BoneCards } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { useAuthStore } from '@/store/auth-store';
import { asistenciaApi, ApiError } from '@/lib/api';
import { hasPermission, getRoleLabel, roleAvatarClass, isUserRole } from '@/lib/roles';
import { cn } from '@/lib/utils';
import type {
  AsistenciaEstado,
  AsistenciaPlanilla,
  AsistenciaResumen,
  CreateAsistenciaPayload,
  UpdateAsistenciaPayload,
} from '@/types/api';

const PAGE_SIZE = 25;
const inputClass =
  'mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'text-xs font-medium uppercase tracking-wider text-muted-foreground';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/** Estado del backend usa DIA_LIBRE; la UI lo muestra con espacio. */
const estadoLabel: Record<AsistenciaEstado, string> = {
  PRESENTE: 'PRESENTE',
  TARDANZA: 'TARDANZA',
  AUSENTE: 'AUSENTE',
  DIA_LIBRE: 'DIA LIBRE',
};

const estadoStyle: Record<AsistenciaEstado, string> = {
  PRESENTE: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  TARDANZA: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  AUSENTE: 'bg-red-500/10 border-red-500/30 text-red-400',
  DIA_LIBRE: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
};

const recordTypeStyle: Record<string, string> = {
  ENTRADA: 'text-emerald-400',
  TARDANZA: 'text-amber-400',
  SALIDA: 'text-red-400',
};

const timeFormatter = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
});

const formatHora = (iso: string | null): string =>
  iso && !Number.isNaN(new Date(iso).getTime()) ? timeFormatter.format(new Date(iso)) : '—';

const padDatePart = (value: number) => String(value).padStart(2, '0');

const localDateValue = (date = new Date()): string =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const formatFecha = (fecha: string): string => {
  const date = new Date(`${fecha.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? fecha
    : date.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
};

/** Convierte ISO a la zona local del navegador sin recortar el offset. */
const isoToDatetimeLocal = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${localDateValue(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
};

/** datetime-local representa hora local; toISOString conserva ese instante con su offset. */
const datetimeLocalToIso = (value: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

/** Iniciales a partir del username, para el avatar (el backend no las trae). */
const initialsOf = (username: string): string =>
  username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '—';

/** Color del avatar por rol; los roles personalizados caen a un neutro. */
const avatarColorOf = (rol: string): string =>
  isUserRole(rol) ? roleAvatarClass[rol] : 'bg-muted-foreground';

/** Marcaje derivado de la planilla (entrada/salida por empleado). */
interface Marcaje {
  hora: string;
  iso: string;
  empleado: string;
  accion: string;
  tipo: 'ENTRADA' | 'TARDANZA' | 'SALIDA';
}

export default function AsistenciaPage() {
  const permisos = useAuthStore((state) => state.permisos);
  const boneyardBuild = useBoneyardBuild();
  const canRead =
    boneyardBuild || hasPermission(permisos, 'asistencia:leer');
  const canCreate =
    boneyardBuild || hasPermission(permisos, 'asistencia:crear');
  const canEdit =
    boneyardBuild || hasPermission(permisos, 'asistencia:editar');
  const canDelete =
    boneyardBuild || hasPermission(permisos, 'asistencia:eliminar');

  const [activeView, setActiveView] = useState<'resumen' | 'historial'>('resumen');

  const [planilla, setPlanilla] = useState<AsistenciaPlanilla[]>([]);
  const [resumen, setResumen] = useState<AsistenciaResumen | null>(null);
  const [fecha, setFecha] = useState(localDateValue);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [detail, setDetail] = useState<AsistenciaPlanilla | null>(null);
  const [formRow, setFormRow] = useState<AsistenciaPlanilla | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AsistenciaPlanilla | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;

    Promise.all([
      asistenciaApi.listAsistencia({ pagina, limite: PAGE_SIZE, fecha }),
      asistenciaApi.getAsistenciaResumen(fecha),
    ])
      .then(([lista, kpis]) => {
        if (cancelled) return;
        setPlanilla(lista.data);
        setTotal(lista.total);
        setTotalPaginas(lista.totalPaginas || 1);
        setResumen(kpis);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = errorMessage(err, 'No se pudo cargar la asistencia.');
        setPlanilla([]);
        setResumen(null);
        setTotal(0);
        setTotalPaginas(1);
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canRead, fecha, pagina, reloadToken]);

  const recargar = useCallback(() => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  /** El spinner se activa aqui, no en el efecto, para no encadenar renders. */
  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

  const cambiarFecha = (value: string) => {
    if (!value) return;
    setLoading(true);
    setPagina(1);
    setFecha(value);
  };

  const eliminarAsistencia = async () => {
    if (!pendingDelete?.asistenciaId) return;
    setDeleting(true);
    setDeleteError(null);
    const toastId = toast.loading('Eliminando registro de asistencia...');
    try {
      await asistenciaApi.deleteAsistencia(pendingDelete.asistenciaId);
      toast.success('Registro de asistencia eliminado.', { id: toastId });
      setPendingDelete(null);
      recargar();
    } catch (err) {
      const message = errorMessage(err, 'No se pudo eliminar la asistencia.');
      setDeleteError(message);
      toast.error(message, { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  /** Historial derivado de la planilla de la pagina: una fila por marcaje. */
  const marcajes = useMemo<Marcaje[]>(() => {
    const filas: Marcaje[] = [];
    for (const emp of planilla) {
      if (emp.horaEntrada) {
        filas.push({
          hora: formatHora(emp.horaEntrada),
          iso: emp.horaEntrada,
          empleado: emp.username,
          accion: 'Registro de entrada',
          tipo: emp.estado === 'TARDANZA' ? 'TARDANZA' : 'ENTRADA',
        });
      }
      if (emp.horaSalida) {
        filas.push({
          hora: formatHora(emp.horaSalida),
          iso: emp.horaSalida,
          empleado: emp.username,
          accion: 'Registro de salida',
          tipo: 'SALIDA',
        });
      }
    }
    return filas.sort((a, b) => a.iso.localeCompare(b.iso));
  }, [planilla]);

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes permiso para ver la asistencia.
      </div>
    );
  }

  const kpis = [
    { label: 'TOTAL PLANILLA', value: String(resumen?.totalEmpleados ?? 0), color: 'text-foreground' },
    { label: 'PRESENTES', value: String(resumen?.presente ?? 0), color: 'text-emerald-400' },
    { label: 'AUSENTES', value: String(resumen?.ausente ?? 0), color: 'text-red-400' },
    { label: 'CON TARDANZA', value: String(resumen?.tardanza ?? 0), color: 'text-amber-500' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 animate-fade-in-up lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Asistencia</h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {formatFecha(fecha)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="asistencia-fecha" className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Fecha de planilla
              </label>
              <div className="relative mt-1">
                <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="asistencia-fecha"
                  type="date"
                  value={fecha}
                  onChange={(event) => cambiarFecha(event.target.value)}
                  className="h-10 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div className="flex gap-2" aria-label="Vista de asistencia">
              <button
                type="button"
                aria-pressed={activeView === 'resumen'}
                onClick={() => setActiveView('resumen')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeView === 'resumen'
                    ? 'bg-amber-500 text-black'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border'
                )}
              >
                Resumen del día
              </button>
              <button
                type="button"
                aria-pressed={activeView === 'historial'}
                onClick={() => setActiveView('historial')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeView === 'historial'
                    ? 'bg-amber-500 text-black'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border'
                )}
              >
                Marcajes
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
              <p className={cn('text-base lg:text-lg font-bold font-mono mt-1', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Resumen view */}
        {activeView === 'resumen' && (
          <Bones name="asistencia-grid" loading={loading} placeholder={<BoneCards count={6} />}>
            {planilla.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No hay empleados en tu ámbito para la fecha seleccionada.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                {planilla.map((emp) => (
                  <div
                    key={emp.usuarioId}
                    className="rounded-xl border border-border bg-card p-4 hover:border-border transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white', avatarColorOf(emp.rol))}>
                          {initialsOf(emp.username)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{emp.username}</p>
                          <p className="text-xs text-muted-foreground">{getRoleLabel(emp.rol)}</p>
                        </div>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded border text-[10px] font-bold', estadoStyle[emp.estado])}>
                        {estadoLabel[emp.estado]}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Turno', value: emp.turno || '—' },
                        { label: 'Entrada', value: formatHora(emp.horaEntrada) },
                        { label: 'Horas', value: emp.horasTrabajadas != null ? `${emp.horasTrabajadas}h` : '—' },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-lg bg-muted/60 p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                          <p className={cn(
                            'text-xs font-semibold mt-0.5',
                            stat.label === 'Entrada' && emp.horaEntrada ? 'text-emerald-400' : 'text-foreground'
                          )}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => setDetail(emp)}
                        aria-label={`Ver detalle de asistencia de ${emp.username}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        <Eye size={13} /> Detalle
                      </button>
                      {!emp.asistenciaId && canCreate && (
                        <button
                          type="button"
                          onClick={() => setFormRow(emp)}
                          aria-label={`Registrar asistencia de ${emp.username}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 text-xs font-semibold text-primary-text hover:bg-primary/20"
                        >
                          <Plus size={13} /> Registrar
                        </button>
                      )}
                      {emp.asistenciaId && canEdit && (
                        <button
                          type="button"
                          onClick={() => setFormRow(emp)}
                          aria-label={`Editar asistencia de ${emp.username}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 text-xs font-semibold text-primary-text hover:bg-primary/20"
                        >
                          <Pencil size={13} /> Editar
                        </button>
                      )}
                      {emp.asistenciaId && canDelete && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(emp)}
                          aria-label={`Eliminar asistencia de ${emp.username}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Bones>
        )}

        {/* Historial view */}
        {activeView === 'historial' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Marcajes de la fecha seleccionada</h2>
              <p className="mt-1 text-xs text-muted-foreground">Solo se muestran los marcajes de la página actual.</p>
            </div>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Hora', 'Empleado', 'Accion', 'Tipo'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {marcajes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                        {loading ? '' : 'Sin marcajes en esta página para la fecha seleccionada.'}
                      </td>
                    </tr>
                  ) : (
                    marcajes.map((rec, i) => (
                      <tr key={i} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-4 text-muted-foreground font-mono">{rec.hora}</td>
                        <td className="px-5 py-4 text-foreground font-medium">{rec.empleado}</td>
                        <td className="px-5 py-4 text-muted-foreground">{rec.accion}</td>
                        <td className="px-5 py-4">
                          <span className={cn('text-xs font-bold tracking-wide', recordTypeStyle[rec.tipo])}>
                            {rec.tipo}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination page={pagina} totalPages={totalPaginas} total={total} pageSize={PAGE_SIZE} onPageChange={irAPagina} />

        <ModalShell
          open={Boolean(detail)}
          title={detail?.username ?? 'Detalle de asistencia'}
          subtitle="Datos de la fila seleccionada de la planilla"
          onClose={() => setDetail(null)}
        >
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', avatarColorOf(detail.rol))}>
                    {initialsOf(detail.username)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{detail.username}</p>
                    <p className="text-xs text-muted-foreground">{getRoleLabel(detail.rol)}</p>
                  </div>
                </div>
                <span className={cn('shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold', estadoStyle[detail.estado])}>
                  {estadoLabel[detail.estado]}
                </span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Fecha', formatFecha(detail.fecha)],
                  ['Sede', detail.sede?.nombre ?? 'Sin sede'],
                  ['Turno', detail.turno || 'Sin registrar'],
                  ['Entrada', formatHora(detail.horaEntrada)],
                  ['Salida', formatHora(detail.horaSalida)],
                  ['Horas trabajadas', detail.horasTrabajadas != null ? `${detail.horasTrabajadas} h` : 'Sin calcular'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-card p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium capitalize text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notas</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{detail.notas || 'Sin notas'}</p>
              </div>
            </div>
          )}
        </ModalShell>

        {formRow && (
          <AsistenciaFormModal
            row={formRow}
            onClose={() => setFormRow(null)}
            onDone={() => {
              setFormRow(null);
              recargar();
            }}
          />
        )}

        <ModalShell
          open={Boolean(pendingDelete)}
          title="Eliminar registro de asistencia"
          subtitle={pendingDelete ? `${pendingDelete.username} · ${formatFecha(pendingDelete.fecha)}` : undefined}
          onClose={() => {
            if (!deleting) {
              setPendingDelete(null);
              setDeleteError(null);
            }
          }}
        >
          <p className="text-sm leading-6 text-muted-foreground">
            Esta acción eliminará permanentemente el registro seleccionado. La fila del empleado seguirá visible en la planilla como ausencia sin registro.
          </p>
          {deleteError && <p role="alert" className="mt-3 text-sm text-destructive">{deleteError}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setPendingDelete(null);
                setDeleteError(null);
              }}
              className="h-10 rounded-lg border border-border bg-muted/60 px-4 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void eliminarAsistencia()}
              className="h-10 rounded-lg bg-destructive px-5 text-sm font-bold text-destructive-foreground disabled:opacity-50"
            >
              {deleting ? 'ELIMINANDO…' : 'ELIMINAR'}
            </button>
          </div>
        </ModalShell>
      </div>
    </div>
  );
}

function AsistenciaFormModal({
  row,
  onClose,
  onDone,
}: {
  row: AsistenciaPlanilla;
  onClose: () => void;
  onDone: () => void;
}) {
  const isCreate = !row.asistenciaId;
  const [estado, setEstado] = useState<AsistenciaEstado>(isCreate ? 'PRESENTE' : row.estado);
  const [turno, setTurno] = useState(row.turno ?? '');
  const [horaEntrada, setHoraEntrada] = useState(isoToDatetimeLocal(row.horaEntrada));
  const [horaSalida, setHoraSalida] = useState(isoToDatetimeLocal(row.horaSalida));
  const [notas, setNotas] = useState(row.notas ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entradaIso = datetimeLocalToIso(horaEntrada);
    const salidaIso = datetimeLocalToIso(horaSalida);
    if ((horaEntrada && !entradaIso) || (horaSalida && !salidaIso)) {
      setFormError('Revisa el formato de las horas de entrada y salida.');
      return;
    }
    if (!isCreate && row.horaEntrada && !horaEntrada) {
      setFormError('El backend no permite eliminar una hora de entrada registrada.');
      return;
    }
    if (!isCreate && row.horaSalida && !horaSalida) {
      setFormError('El backend no permite eliminar una hora de salida registrada.');
      return;
    }

    const jornada: UpdateAsistenciaPayload = {
      estado,
      turno: turno.trim(),
      notas: notas.trim(),
      ...(entradaIso ? { horaEntrada: entradaIso } : {}),
      ...(salidaIso ? { horaSalida: salidaIso } : {}),
    };

    setSaving(true);
    setFormError(null);
    const toastId = toast.loading(isCreate ? 'Registrando asistencia...' : 'Actualizando asistencia...');
    try {
      if (!row.asistenciaId) {
        const payload: CreateAsistenciaPayload = {
          usuarioId: row.usuarioId,
          fecha: row.fecha.slice(0, 10),
          ...jornada,
        };
        await asistenciaApi.createAsistencia(payload);
        toast.success('Asistencia registrada.', { id: toastId });
      } else {
        await asistenciaApi.updateAsistencia(row.asistenciaId, jornada);
        toast.success('Asistencia actualizada.', { id: toastId });
      }
      onDone();
    } catch (err) {
      const message = errorMessage(err, 'No se pudo guardar la asistencia.');
      setFormError(message);
      toast.error(message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open
      title={isCreate ? 'REGISTRAR ASISTENCIA' : 'EDITAR ASISTENCIA'}
      subtitle={`${row.username} · ${formatFecha(row.fecha)}`}
      onClose={() => {
        if (!saving) onClose();
      }}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="asistencia-estado" className={labelClass}>Estado</label>
            <select
              id="asistencia-estado"
              value={estado}
              onChange={(event) => setEstado(event.target.value as AsistenciaEstado)}
              className={inputClass}
            >
              {(Object.keys(estadoLabel) as AsistenciaEstado[]).map((value) => (
                <option key={value} value={value}>{estadoLabel[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="asistencia-turno" className={labelClass}>Turno</label>
            <input
              id="asistencia-turno"
              value={turno}
              onChange={(event) => setTurno(event.target.value)}
              maxLength={50}
              placeholder="Ej. Apertura"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="asistencia-entrada" className={labelClass}>Hora de entrada</label>
            <input
              id="asistencia-entrada"
              type="datetime-local"
              value={horaEntrada}
              onChange={(event) => setHoraEntrada(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="asistencia-salida" className={labelClass}>Hora de salida</label>
            <input
              id="asistencia-salida"
              type="datetime-local"
              value={horaSalida}
              onChange={(event) => setHoraSalida(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="asistencia-notas" className={labelClass}>Notas</label>
            <textarea
              id="asistencia-notas"
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              maxLength={300}
              rows={4}
              className={cn(inputClass, 'h-auto min-h-24 py-2.5')}
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{notas.length}/300</p>
          </div>
        </div>

        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-border bg-muted/60 px-4 text-sm text-foreground hover:bg-muted disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'GUARDANDO…' : isCreate ? 'REGISTRAR' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
