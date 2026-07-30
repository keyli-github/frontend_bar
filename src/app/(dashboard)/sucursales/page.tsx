'use client';

/**
 * Gestion de sedes — `EstablecimientosController`.
 *
 *   GET    /api/establecimientos       (permiso `establecimientos:leer`)
 *   POST   /api/establecimientos       (permiso `establecimientos:crear`)
 *   PATCH  /api/establecimientos/:id   (permiso `establecimientos:editar`)
 *   DELETE /api/establecimientos/:id   (permiso `establecimientos:editar`)
 *
 * Reglas del backend reflejadas en la UI:
 *   - Un no-SUPERADMIN solo recibe su propia sede (lo filtra el servidor).
 *   - No se puede desactivar ni borrar una sede con usuarios asignados.
 *   - El RUC, si se envia, debe tener exactamente 11 digitos.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pagination } from '@/components/shared/pagination';
import { useAuthStore } from '@/store/auth-store';
import { establecimientosApi, ApiError } from '@/lib/api';
import { can, hasPermission } from '@/lib/roles';
import type { Establecimiento } from '@/types/api';
import { Plus, X, Building2, Users, MapPin, Phone, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bones, BoneCards } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';

const inputClass =
  'w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all text-sm';
const labelClass = 'text-xs text-muted-foreground uppercase tracking-wider';
const PAGE_SIZE = 25;

const errMsg = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;

export default function SucursalesPage() {
  const permisos = useAuthStore((s) => s.permisos);
  const boneyardBuild = useBoneyardBuild();
  const puedeLeer =
    boneyardBuild || hasPermission(permisos, 'establecimientos:leer');
  const puedeCrear = boneyardBuild || can(permisos, 'sucursales', 'create');
  const puedeEditar = boneyardBuild || can(permisos, 'sucursales', 'edit');

  const [sedes, setSedes] = useState<Establecimiento[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Establecimiento | null>(null);

  useEffect(() => {
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
      .catch((e: unknown) => {
        if (!cancelled) setError(errMsg(e, 'No se pudieron cargar las sedes.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pagina, reloadToken]);

  const recargar = useCallback(() => {
    setLoading(true);
    setReloadToken((n) => n + 1);
  }, []);

  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

  const eliminar = async (sede: Establecimiento) => {
    if (sede._count.usuarios > 0) {
      toast.error(`"${sede.nombre}" tiene ${sede._count.usuarios} usuario(s) asignado(s).`);
      return;
    }
    if (!confirm(`¿Eliminar la sede ${sede.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await establecimientosApi.deleteEstablecimiento(sede.id);
      toast.success(res.message);
      recargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo eliminar la sede.'));
    }
  };

  const totalUsuarios = sedes.reduce((n, s) => n + s._count.usuarios, 0);
  const activas = sedes.filter((s) => s.activo).length;

  if (!puedeLeer) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          No tienes permiso para ver las sedes.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sucursales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} sede{total === 1 ? '' : 's'} · {activas} activa
            {activas === 1 ? '' : 's'} · {totalUsuarios} usuario
            {totalUsuarios === 1 ? '' : 's'}
          </p>
        </div>
        {puedeCrear && (
          <button
            type="button"
            onClick={() => setCreando(true)}
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

      <Bones
        name="sucursales-grid"
        loading={loading}
        placeholder={<BoneCards count={4} />}
      >
        {sedes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay sedes registradas.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">
          {sedes.map((sede) => (
            <div key={sede.id} className="surface flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Building2 size={16} className="shrink-0 text-primary-text" />
                  <h2 className="truncate font-semibold text-foreground">{sede.nombre}</h2>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold',
                    sede.activo
                      ? 'border-success/25 bg-success/10 text-success'
                      : 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {sede.activo ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>

              <dl className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="mt-0.5 shrink-0" />
                  <dd className="min-w-0">{sede.direccion ?? 'Sin dirección'}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={12} className="shrink-0" />
                  <dd>{sede.telefono ?? 'Sin teléfono'}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={12} className="shrink-0" />
                  <dd>
                    {sede._count.usuarios} usuario{sede._count.usuarios === 1 ? '' : 's'}
                  </dd>
                </div>
                {sede.ruc && (
                  <div className="pt-0.5 font-mono text-[11px]">RUC {sede.ruc}</div>
                )}
              </dl>

              {puedeEditar && (
                <div className="mt-auto flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditando(sede)}
                    className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary-text transition-colors hover:bg-primary/20"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void eliminar(sede)}
                    disabled={sede._count.usuarios > 0}
                    title={
                      sede._count.usuarios > 0
                        ? 'Tiene usuarios asignados'
                        : 'Eliminar sede'
                    }
                    className="flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </Bones>

      <Pagination
        page={pagina}
        totalPages={totalPaginas}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={irAPagina}
      />

      {(creando || editando) && (
        <SedeFormModal
          sede={editando ?? undefined}
          onClose={() => {
            setCreando(false);
            setEditando(null);
          }}
          onDone={() => {
            setCreando(false);
            setEditando(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// ALTA / EDICION
// ============================================================

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

  /** Mismo criterio que el @Matches del DTO: 11 digitos, o vacio. */
  const rucOk = ruc === '' || /^\d{11}$/.test(ruc);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rucOk) return;
    setSaving(true);
    setError(null);

    // Se envian las cadenas aunque esten vacias: es la unica forma de BORRAR
    // un campo. Con `|| undefined` la clave desaparecia del JSON y el backend
    // (que solo mira `!== undefined`) dejaba el valor anterior intacto, asi
    // que vaciar la direccion o el telefono no tenia ningun efecto.
    const payload = {
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      ruc: ruc.trim(),
    };

    try {
      if (isCreate) {
        await establecimientosApi.createEstablecimiento(payload);
        toast.success('Sede creada');
      } else {
        await establecimientosApi.updateEstablecimiento(sede.id, {
          ...payload,
          activo,
        });
        toast.success('Sede actualizada');
      }
      onDone();
    } catch (e) {
      setError(errMsg(e, 'No se pudo guardar la sede.'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="surface-overlay relative w-full max-w-md animate-scale-in p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {isCreate ? 'NUEVA SEDE' : 'EDITAR SEDE'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="s-nombre" className={labelClass}>
              Nombre
            </label>
            <input
              id="s-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Zona Rosa"
              maxLength={100}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="s-direccion" className={labelClass}>
              Dirección
            </label>
            <input
              id="s-direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Av. Principal 123"
              maxLength={200}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="s-telefono" className={labelClass}>
                Teléfono
              </label>
              <input
                id="s-telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+51 999 999 999"
                maxLength={20}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="s-ruc" className={labelClass}>
                RUC
              </label>
              <input
                id="s-ruc"
                value={ruc}
                onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))}
                placeholder="20123456789"
                inputMode="numeric"
                maxLength={11}
                className={cn(inputClass, 'font-mono')}
              />
              {!rucOk && (
                <p className="mt-1.5 text-[11px] text-destructive">
                  Deben ser 11 dígitos.
                </p>
              )}
            </div>
          </div>

          {!isCreate && (
            <div>
              <label htmlFor="s-activo" className={labelClass}>
                Estado
              </label>
              <select
                id="s-activo"
                value={activo ? '1' : '0'}
                onChange={(e) => setActivo(e.target.value === '1')}
                className={inputClass}
              >
                <option value="1">Activa</option>
                <option value="0">Inactiva</option>
              </select>
              {sede._count.usuarios > 0 && !activo && (
                <p className="mt-1.5 text-[11px] text-destructive">
                  El servidor rechazará desactivarla: tiene {sede._count.usuarios}{' '}
                  usuario(s).
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-10 flex-1 rounded-lg border border-border bg-muted/60 text-sm text-foreground transition-colors hover:bg-muted">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !rucOk}
              className="h-10 flex-1 rounded-lg bg-primary text-sm font-bold tracking-wide text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'GUARDANDO…' : isCreate ? 'CREAR' : 'GUARDAR'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
