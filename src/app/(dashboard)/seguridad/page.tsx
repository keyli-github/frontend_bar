'use client';

/**
 * Seguridad — dispositivos conectados del usuario autenticado.
 *
 * Conectado a:
 *   GET    /api/auth/sesiones
 *   DELETE /api/auth/sesiones/:id   (cerrar una sesion)
 *   DELETE /api/auth/sesiones       (cerrar las demas)
 *
 * El backend expone `SessionInfo` (id, deviceName, deviceType, ip, lastUsedAt,
 * createdAt, actual). No captura user-agent ni geo-IP, por eso aqui no se
 * pintan "navegador" ni "ubicacion": no existirian datos reales que mostrar.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  Clock3,
  KeyRound,
  Laptop,
  LockKeyhole,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Tablet,
} from 'lucide-react';

import { ConfirmModal } from '@/components/shared/confirm-modal';
import { BoneKpis, BoneList, Bones } from '@/components/shared/bones';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { authApi, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { SessionInfo } from '@/types/api';

type PendingAction =
  | { type: 'session'; session: SessionInfo }
  | { type: 'others' }
  | null;

const protections = [
  ['Contraseña segura', 'Cumple la política de 12 caracteres'],
  ['Tokens rotativos', 'Renovación protegida contra reutilización'],
  ['Bloqueo automático', '5 intentos fallidos durante 15 minutos'],
  ['Sesiones visibles', 'Puedes revocar dispositivos remotamente'],
];

const dateFmt = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatDate = (iso: string | null): string =>
  iso ? dateFmt.format(new Date(iso)) : '—';

/**
 * En desarrollo el backend ve la IP de loopback (`::1` en IPv6, `127.0.0.1` en
 * IPv4), porque el cliente y el servidor viven en la misma maquina. Node
 * ademas antepone `::ffff:` a las IPv4 mapeadas. Se traduce a algo legible.
 */
const formatIp = (ip: string | null): string => {
  if (!ip) return 'oculta';
  const clean = ip.replace(/^::ffff:/i, '');
  if (clean === '::1' || clean === '127.0.0.1') return 'Este equipo (local)';
  return clean;
};

export default function SeguridadPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState('');

  // El setState vive en los callbacks de la promesa, nunca en el cuerpo del
  // efecto (regla `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    authApi
      .getSesiones()
      .then((data) => {
        if (cancelled) return;
        setSessions(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message : 'No se pudieron cargar las sesiones.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const recargar = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const currentSession = sessions.find((session) => session.actual);
  const otherSessions = sessions.filter((session) => !session.actual);

  const confirmClose = async () => {
    if (!pendingAction) return;
    setProcessing(true);
    try {
      if (pendingAction.type === 'others') {
        const closed = otherSessions.length;
        await authApi.cerrarOtrasSesiones();
        setNotice(
          `${closed} ${closed === 1 ? 'sesión cerrada' : 'sesiones cerradas'} correctamente.`,
        );
      } else {
        const name = pendingAction.session.deviceName ?? 'el dispositivo';
        await authApi.cerrarSesion(pendingAction.session.id);
        setNotice(`La sesión de ${name} se cerró correctamente.`);
      }
      setPendingAction(null);
      recargar();
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : 'No se pudo cerrar la sesión.',
      );
      setPendingAction(null);
    } finally {
      setProcessing(false);
    }
  };

  const modalTitle = pendingAction?.type === 'others' ? 'Cerrar las otras sesiones' : 'Cerrar esta sesión';
  const modalDescription = pendingAction?.type === 'others'
    ? `Se cerrarán ${otherSessions.length} ${otherSessions.length === 1 ? 'sesión activa' : 'sesiones activas'}. Este dispositivo seguirá conectado.`
    : pendingAction?.session
      ? `Se cerrará el acceso de ${pendingAction.session.deviceName ?? 'este dispositivo'}. Para volver a usarlo será necesario iniciar sesión nuevamente.`
      : '';

  return (
    <div className="min-h-full bg-background"><div className="space-y-4 p-3 sm:p-4 lg:p-6">
        <PageHeader
          title="Seguridad"
          subtitle="Administra tu contraseña y revisa los dispositivos conectados."
          badge={(
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Cuenta protegida
            </span>
          )}
        />

        <Bones name="seguridad-kpis" loading={loading} onRetry={recargar} placeholder={<BoneKpis count={4} />}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger-children">
          <StatCard label="SESIONES ACTIVAS" value={String(sessions.length)} subtitle="Dispositivos conectados" icon={<MonitorSmartphone size={13} />} />
          <StatCard label="OTROS DISPOSITIVOS" value={String(otherSessions.length)} subtitle="Fuera de este equipo" icon={<Laptop size={13} />} valueColor="text-blue-500" />
          <StatCard label="SESIÓN ACTUAL" value="Activa" subtitle={currentSession?.deviceName ?? 'Sin información'} icon={<ShieldCheck size={13} />} valueColor="text-emerald-500" />
          <StatCard label="CONTRASEÑA" value="Vigente" subtitle="Política completa" icon={<KeyRound size={13} />} valueColor="text-amber-500" />
        </div>
        </Bones>

        {notice && (
          <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 animate-fade-in">
            <span className="flex items-center gap-2"><CheckCircle2 size={16} /> {notice}</span>
            <button type="button" onClick={() => setNotice('')} className="text-xs font-semibold hover:underline">Ocultar</button>
          </div>
        )}

        {loadError && (
          <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {loadError}
          </div>
        )}

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Dispositivos conectados</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Cierra cualquier sesión que no reconozcas.</p>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction({ type: 'others' })}
                disabled={otherSessions.length === 0}
                className="inline-flex h-8 w-fit items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
              >
                <LogOut size={12} /> Cerrar otras sesiones
              </button>
            </div>

            <Bones
              name="seguridad-sesiones"
              loading={loading}
              onRetry={recargar}
              placeholder={<div className="px-4"><BoneList rows={4} avatar /></div>}
            >
            <div className="divide-y divide-border">
              {sessions.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">No hay sesiones activas.</p>
              ) : (
                sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    action={session.actual ? (
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Actual</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingAction({ type: 'session', session })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 text-xs font-medium text-foreground transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500"
                      >
                        <LogOut size={12} /> Cerrar
                      </button>
                    )}
                  />
                ))
              )}
            </div>
            </Bones>
          </section>

          <aside className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <LockKeyhole size={15} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Protección de cuenta</h2>
                <p className="text-[10px] text-muted-foreground">{protections.length} medidas activas</p>
              </div>
            </div>

            <div className="divide-y divide-border px-4">
              {protections.map(([title, detail]) => (
                <div key={title} className="flex items-start gap-2.5 py-3">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-500">
                    <Check size={9} strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border p-4">
              <Link href="/cambiar-password" className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-xs font-bold text-black transition-colors hover:bg-amber-400">
                <KeyRound size={13} /> Cambiar contraseña
              </Link>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">El cambio cerrará todas las sesiones.</p>
            </div>
          </aside>
        </div>
      </div>

      <ConfirmModal
        open={pendingAction !== null}
        title={modalTitle}
        description={modalDescription}
        confirmLabel="Cerrar sesión"
        variant="danger"
        loading={processing}
        onConfirm={() => void confirmClose()}
        onClose={() => setPendingAction(null)}
      />
    </div>
  );
}

function SessionRow({ session, action }: { session: SessionInfo; action: ReactNode }) {
  return (
    <article className={cn(
      'grid gap-3 px-4 py-3 transition-colors hover:bg-muted/20 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center',
      session.actual && 'bg-emerald-500/[0.035]',
    )}>
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', session.actual ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground')}>
          <SessionIcon type={session.deviceType} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{session.deviceName ?? 'Dispositivo desconocido'}</h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{session.deviceType ?? 'Dispositivo'}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/75">Desde {formatDate(session.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pl-12 text-xs sm:block sm:space-y-1 sm:pl-0">
        <p className="font-mono text-[10px] text-muted-foreground">IP {formatIp(session.ip)}</p>
        <p className={cn('col-span-2 flex items-center gap-1.5 text-[11px] font-medium', session.actual ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
          <Clock3 size={10} /> {formatDate(session.lastUsedAt)}
        </p>
      </div>

      <div className="pl-12 sm:pl-0">{action}</div>
    </article>
  );
}

function SessionIcon({ type }: { type: string | null }) {
  if (type === 'android') return <Smartphone size={17} />;
  if (type === 'ios') return <Tablet size={17} />;
  return <Laptop size={17} />;
}
