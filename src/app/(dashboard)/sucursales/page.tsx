'use client';

/** Gestion de sedes conectada a EstablecimientosController. */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Calendar,
  Eye,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { Pagination } from '@/components/shared/pagination';
import { ModalShell } from '@/components/shared/modal-shell';
import { Bone, Bones, BoneCards, BoneKpis, BoneList } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { useAuthStore } from '@/store/auth-store';
import { establecimientosApi, ApiError } from '@/lib/api';
import { can, hasPermission } from '@/lib/roles';
import { cn } from '@/lib/utils';
import type { Establecimiento } from '@/types/api';

const PAGE_SIZE = 25;
const inputClass =
  'mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'text-xs font-medium uppercase tracking-wider text-muted-foreground';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function SucursalesPage() {
  const permisos = useAuthStore((state) => state.permisos);
  const boneyardBuild = useBoneyardBuild();
  const canRead =
    boneyardBuild || hasPermission(permisos, 'establecimientos:leer');
  const canCreate = boneyardBuild || can(permisos, 'sucursales', 'create');
  const canEdit = boneyardBuild || can(permisos, 'sucursales', 'edit');

  const [sedes, setSedes] = useState<Establecimiento[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Establecimiento | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Establecimiento | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Establecimiento | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;

    establecimientosApi
      .listEstablecimientos({ pagina, limite: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setSedes(result.data);
        setTotal(result.total);
        setTotalPaginas(result.totalPaginas || 1);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'No se pudieron cargar las sedes.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canRead, pagina, reloadToken]);

  const recargar = useCallback(() => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

  const openDetail = async (sede: Establecimiento) => {
    setDetailOpen(true);
    setDetail(sede);
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await establecimientosApi.getEstablecimiento(sede.id));
    } catch (err) {
      setDetailError(errorMessage(err, 'No se pudo actualizar el detalle de la sede.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteSede = async () => {
    if (!pendingDelete) return;
    if (pendingDelete._count.usuarios > 0) {
      setDeleteError('La sede tiene usuarios asignados y no se puede eliminar.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await establecimientosApi.deleteEstablecimiento(pendingDelete.id);
      toast.success(result.message);
      setPendingDelete(null);
      recargar();
    } catch (err) {
      setDeleteError(errorMessage(err, 'No se pudo eliminar la sede.'));
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = sedes.filter((sede) => sede.activo).length;
  const inactiveCount = sedes.length - activeCount;
  const userCount = sedes.reduce((count, sede) => count + sede._count.usuarios, 0);

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes permiso para ver las sedes.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-5 lg:p-6">
      <div className="flex flex-col gap-3 animate-fade-in-up sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Sucursales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? <Bone className="h-3.5 w-32" /> : <>{total} sede{total === 1 ? '' : 's'} en tu ámbito</>}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold tracking-wide text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Plus size={16} /> NUEVA SEDE
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <Bones name="sucursales-kpis" loading={loading} placeholder={<BoneKpis count={4} />}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger-children">
        {[
          { label: 'SEDES TOTALES', value: total, icon: <Building2 size={16} />, color: 'text-foreground' },
          { label: 'ACTIVAS EN PÁGINA', value: activeCount, icon: <Building2 size={16} />, color: 'text-success' },
          { label: 'INACTIVAS EN PÁGINA', value: inactiveCount, icon: <Calendar size={16} />, color: 'text-muted-foreground' },
          { label: 'USUARIOS EN PÁGINA', value: userCount, icon: <Users size={16} />, color: 'text-primary-text' },
        ].map((metric) => (
          <div key={metric.label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{metric.icon}</div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{metric.label}</p>
              <p className={cn('mt-0.5 font-mono text-base font-bold lg:text-lg', metric.color)}>{metric.value}</p>
            </div>
          </div>
        ))}
      </div>
      </Bones>

      <Bones name="sucursales-grid" loading={loading} placeholder={<BoneCards count={4} />}>
        {sedes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay sedes registradas.</p>
        ) : (
          <div className="space-y-3 stagger-children">
            {sedes.map((sede) => {
              const canDelete = sede._count.usuarios === 0;
              return (
                <article
                  key={sede.id}
                  className={cn(
                    'overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md',
                    sede.activo ? 'border-border' : 'border-dashed border-muted-foreground/30',
                  )}
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-4 lg:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl text-white', sede.activo ? 'bg-primary' : 'bg-muted-foreground')}>
                            <Building2 size={18} />
                          </div>
                          <div className="min-w-0">
                            <h2 className="truncate font-bold text-foreground">{sede.nombre}</h2>
                            <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                              <MapPin size={11} className="mt-0.5 shrink-0" /> {sede.direccion || 'Sin dirección registrada'}
                            </p>
                          </div>
                        </div>
                        <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold', sede.activo ? 'border-success/25 bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground')}>
                          {sede.activo ? 'ACTIVA' : 'INACTIVA'}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs sm:grid-cols-3">
                        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <Phone size={13} className="shrink-0 text-primary-text" />
                          <span className="truncate">{sede.telefono || 'Sin teléfono'}</span>
                        </div>
                        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <span className="font-mono text-[10px] font-bold text-primary-text">RUC</span>
                          <span className="truncate font-mono">{sede.ruc || 'Sin registrar'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users size={13} className="shrink-0 text-primary-text" />
                          <span>{sede._count.usuarios} usuario{sede._count.usuarios === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center border-t border-border px-4 py-3 md:w-64 md:border-l md:border-t-0 md:px-5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Última actualización</p>
                      <p className="mt-1 text-xs font-medium text-foreground">{dateFormatter.format(new Date(sede.updatedAt))}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {canDelete ? 'Sin usuarios asignados.' : 'La baja y eliminación están condicionadas.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-border bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
                    <p className="text-[11px] text-muted-foreground">
                      {canDelete
                        ? 'Esta sede se puede eliminar permanentemente.'
                        : `Tiene ${sede._count.usuarios} usuarios: no se puede desactivar ni eliminar.`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void openDetail(sede)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted">
                        <Eye size={13} /> Ver detalle
                      </button>
                      {canEdit && (
                        <>
                          <button type="button" onClick={() => setEditing(sede)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 text-xs font-semibold text-primary-text hover:bg-primary/20">
                            <Pencil size={13} /> Editar
                          </button>
                          <button type="button" disabled={!canDelete} title={canDelete ? 'Eliminar sede' : 'Solo se puede eliminar con 0 usuarios'} onClick={() => setPendingDelete(sede)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40">
                            <Trash2 size={13} /> Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Bones>

      <Pagination page={pagina} totalPages={totalPaginas} total={total} pageSize={PAGE_SIZE} onPageChange={irAPagina} />

      {(creating || editing) && (
        <SedeFormModal
          sede={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onDone={() => { setCreating(false); setEditing(null); recargar(); }}
        />
      )}

      <ModalShell
        open={detailOpen}
        title={detail?.nombre ?? 'Detalle de sede'}
        subtitle="Información registrada en el backend"
        onClose={() => { setDetailOpen(false); setDetailError(null); }}
      >
        {detailError && <p role="alert" className="mb-3 text-sm text-destructive">{detailError}</p>}
        <Bones name="sucursal-detalle" loading={detailLoading} placeholder={<BoneList rows={6} />}>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <div className={cn('flex size-10 items-center justify-center rounded-xl text-white', detail.activo ? 'bg-primary' : 'bg-muted-foreground')}><Building2 size={18} /></div>
                  <div>
                    <p className="font-semibold text-foreground">{detail.nombre}</p>
                    <p className="text-xs text-muted-foreground">Creada {dateFormatter.format(new Date(detail.createdAt))}</p>
                  </div>
                </div>
                <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-bold', detail.activo ? 'border-success/25 bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground')}>
                  {detail.activo ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Dirección', detail.direccion || 'Sin registrar'],
                  ['Teléfono', detail.telefono || 'Sin registrar'],
                  ['RUC', detail.ruc || 'Sin registrar'],
                  ['Usuarios asignados', String(detail._count.usuarios)],
                  ['Última actualización', dateFormatter.format(new Date(detail.updatedAt))],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-card p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Bones>
      </ModalShell>

      <ModalShell
        open={Boolean(pendingDelete)}
        title="Eliminar sede permanentemente"
        subtitle={pendingDelete?.nombre}
        onClose={() => { if (!deleting) { setPendingDelete(null); setDeleteError(null); } }}
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Esta acción no se puede deshacer. El backend volverá a comprobar que no existan usuarios asignados.
        </p>
        {deleteError && <p role="alert" className="mt-3 text-sm text-destructive">{deleteError}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" disabled={deleting} onClick={() => { setPendingDelete(null); setDeleteError(null); }} className="h-10 rounded-lg border border-border bg-muted/60 px-4 text-sm text-foreground hover:bg-muted disabled:opacity-50">Cancelar</button>
          <button type="button" disabled={deleting} onClick={() => void deleteSede()} className="h-10 rounded-lg bg-destructive px-5 text-sm font-bold text-destructive-foreground disabled:opacity-50">
            {deleting ? 'ELIMINANDO…' : 'ELIMINAR'}
          </button>
        </div>
      </ModalShell>
    </div>
  );
}

function SedeFormModal({
  sede,
  onClose,
  onDone,
}: {
  sede?: Establecimiento;
  onClose: () => void;
  onDone: () => void;
}) {
  const isCreate = !sede;
  const [nombre, setNombre] = useState(sede?.nombre ?? '');
  const [direccion, setDireccion] = useState(sede?.direccion ?? '');
  const [telefono, setTelefono] = useState(sede?.telefono ?? '');
  const [ruc, setRuc] = useState(sede?.ruc ?? '');
  const [activo, setActivo] = useState(sede?.activo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rucIsValid = ruc === '' || /^\d{11}$/.test(ruc);
  const blocksDeactivation = Boolean(sede && sede._count.usuarios > 0 && sede.activo);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rucIsValid) return;
    if (blocksDeactivation && !activo) {
      setError('No se puede desactivar una sede con usuarios asignados.');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      ruc: ruc.trim(),
    };

    try {
      if (isCreate) {
        await establecimientosApi.createEstablecimiento(payload);
        toast.success('Sede creada.');
      } else {
        await establecimientosApi.updateEstablecimiento(sede.id, { ...payload, activo });
        toast.success('Sede actualizada.');
      }
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar la sede.'));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open
      title={isCreate ? 'NUEVA SEDE' : 'EDITAR SEDE'}
      subtitle={isCreate ? 'Registra la información aceptada por el backend.' : `Actualiza los datos de ${sede.nombre}.`}
      onClose={onClose}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="sede-nombre" className={labelClass}>Nombre</label>
            <input id="sede-nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} maxLength={100} required className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="sede-direccion" className={labelClass}>Dirección</label>
            <input id="sede-direccion" value={direccion} onChange={(event) => setDireccion(event.target.value)} maxLength={200} className={inputClass} />
          </div>
          <div>
            <label htmlFor="sede-telefono" className={labelClass}>Teléfono</label>
            <input id="sede-telefono" type="tel" value={telefono} onChange={(event) => setTelefono(event.target.value)} maxLength={20} className={inputClass} />
          </div>
          <div>
            <label htmlFor="sede-ruc" className={labelClass}>RUC</label>
            <input id="sede-ruc" value={ruc} onChange={(event) => setRuc(event.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={11} placeholder="20123456789" className={cn(inputClass, 'font-mono')} />
            {!rucIsValid && <p className="mt-1.5 text-[11px] text-destructive">Debe contener exactamente 11 dígitos o quedar vacío.</p>}
          </div>
        </div>

        {!isCreate && (
          <div>
            <label htmlFor="sede-estado" className={labelClass}>Estado</label>
            <select id="sede-estado" value={activo ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setActivo(event.target.value === 'ACTIVE')} className={inputClass}>
              <option value="ACTIVE">Activa</option>
              <option value="INACTIVE" disabled={blocksDeactivation}>Inactiva</option>
            </select>
            {blocksDeactivation && <p className="mt-1.5 text-xs text-warning">Desactivar está bloqueado mientras existan {sede._count.usuarios} usuarios asignados.</p>}
          </div>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-border bg-muted/60 px-4 text-sm text-foreground hover:bg-muted disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={saving || !rucIsValid} className="h-10 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'GUARDANDO…' : isCreate ? 'CREAR SEDE' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
