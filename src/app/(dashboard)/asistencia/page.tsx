'use client';

/** Asistencia del personal, conectada a AsistenciaController. */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Pagination } from '@/components/shared/pagination';
import { Bones, BoneCards } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { useAuthStore } from '@/store/auth-store';
import { asistenciaApi, ApiError } from '@/lib/api';
import { hasPermission, getRoleLabel, roleAvatarClass, isUserRole } from '@/lib/roles';
import { cn } from '@/lib/utils';
import type { AsistenciaEstado, AsistenciaPlanilla, AsistenciaResumen } from '@/types/api';

const PAGE_SIZE = 25;

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

const timeFormatter = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
});

const formatHora = (iso: string | null): string =>
  iso ? timeFormatter.format(new Date(iso)) : '—';

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
  const canRead = boneyardBuild || hasPermission(permisos, 'asistencia:leer');

  const [activeView, setActiveView] = useState<'resumen' | 'historial'>('resumen');

  const [planilla, setPlanilla] = useState<AsistenciaPlanilla[]>([]);
  const [resumen, setResumen] = useState<AsistenciaResumen | null>(null);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;

    Promise.all([
      asistenciaApi.listAsistencia({ pagina, limite: PAGE_SIZE }),
      asistenciaApi.getAsistenciaResumen(),
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
        if (!cancelled) setError(errorMessage(err, 'No se pudo cargar la asistencia.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canRead, pagina]);

  /** El spinner se activa aqui, no en el efecto, para no encadenar renders. */
  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Asistencia</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('resumen')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeView === 'resumen'
                  ? 'bg-amber-500 text-black'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border'
              )}
            >
              Resumen Del Dia
            </button>
            <button
              onClick={() => setActiveView('historial')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeView === 'historial'
                  ? 'bg-amber-500 text-black'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border'
              )}
            >
              Historial
            </button>
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
              <p className="text-sm text-muted-foreground">No hay empleados en tu ámbito.</p>
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
              <h2 className="font-semibold text-foreground">Registros de hoy</h2>
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
                        {loading ? '' : 'Sin marcajes registrados hoy.'}
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
      </div>
    </div>
  );
}
