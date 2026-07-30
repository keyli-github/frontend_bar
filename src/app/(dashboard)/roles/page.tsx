'use client';

/**
 * Gestion de roles — `RolesController` + `PermisosController`.
 *
 *   GET    /api/roles                 (permiso `roles:leer`)
 *   POST   /api/roles                 (solo SUPERADMIN)
 *   PATCH  /api/roles/:id             (solo SUPERADMIN)
 *   DELETE /api/roles/:id             (solo SUPERADMIN)
 *   PUT    /api/roles/:id/permisos    (solo SUPERADMIN, reemplazo total)
 *   GET    /api/permisos/agrupados    (para el selector)
 *
 * Reglas del backend reflejadas en la UI:
 *   - `nombre` es inmutable tras crear el rol (solo existe en CreateRolDto).
 *   - `nivel` valido entre 1 y 99; 0 y 100 estan reservados.
 *   - Los roles del sistema (ROLES en roles.constants.ts) no se pueden borrar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pagination } from '@/components/shared/pagination';
import { useAuthStore } from '@/store/auth-store';
import { rolesApi, permisosApi, ApiError } from '@/lib/api';
import { getRoleLabel, hasPermission } from '@/lib/roles';
import type { Permiso, PermisosAgrupados, Rol } from '@/types/api';
import { Plus, X, Shield, Users, Lock, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bones, BoneCards } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';

/** Roles sembrados por el sistema: el backend impide eliminarlos. */
const PROTECTED = ['SUPERADMIN', 'ADMIN', 'CAJERO', 'MOZO', 'COCINA', 'BARTENDER'];
const PAGE_SIZE = 25;

const inputClass =
  'w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all text-sm';
const labelClass = 'text-xs text-muted-foreground uppercase tracking-wider';

const nameOf = getRoleLabel;

const errMsg = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;

export default function RolesPage() {
  const permisos = useAuthStore((s) => s.permisos);
  const rolActual = useAuthStore((s) => s.user?.rol);
  const boneyardBuild = useBoneyardBuild();
  const esSuperadmin = boneyardBuild || rolActual === 'SUPERADMIN';
  const puedeLeer = boneyardBuild || hasPermission(permisos, 'roles:leer');

  const [roles, setRoles] = useState<Rol[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [catalogo, setCatalogo] = useState<PermisosAgrupados>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [editando, setEditando] = useState<Rol | null>(null);
  const [creando, setCreando] = useState(false);
  const [asignando, setAsignando] = useState<Rol | null>(null);

  // setState solo en callbacks de promesa (regla react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    rolesApi
      .listRoles({ pagina, limite: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setRoles(result.data);
        setTotal(result.total);
        setTotalPaginas(result.totalPaginas || 1);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errMsg(e, 'No se pudieron cargar los roles.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pagina, reloadToken]);

  useEffect(() => {
    let cancelled = false;
    permisosApi
      .listPermisosAgrupados()
      .then((d) => {
        if (!cancelled) setCatalogo(d);
      })
      .catch(() => {
        if (!cancelled) setCatalogo({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recargar = useCallback(() => {
    setLoading(true);
    setReloadToken((n) => n + 1);
  }, []);

  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

  const totalPermisos = useMemo(
    () => Object.values(catalogo).reduce((acc, arr) => acc + arr.length, 0),
    [catalogo],
  );

  const eliminar = async (rol: Rol) => {
    if (!confirm(`¿Eliminar el rol ${rol.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await rolesApi.deleteRol(rol.id);
      toast.success(`Rol ${rol.nombre} eliminado`);
      recargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo eliminar el rol.'));
    }
  };

  if (!puedeLeer) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          No tienes permiso para ver los roles.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} roles · {totalPermisos} permisos disponibles
          </p>
        </div>
        {esSuperadmin && (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm tracking-wide transition-all active:scale-[0.98] w-fit"
          >
            <Plus size={16} /> NUEVO ROL
          </button>
        )}
      </div>

      {!esSuperadmin && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          Solo un SUPERADMIN puede crear, editar o asignar permisos a los roles.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <Bones
        name="roles-grid"
        loading={loading}
        placeholder={<BoneCards count={6} />}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">
          {roles.map((rol) => {
            const protegido = PROTECTED.includes(rol.nombre);
            return (
              <div key={rol.id} className="surface p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Shield size={15} className="shrink-0 text-primary-text" />
                      <h2 className="truncate font-semibold text-foreground">
                        {nameOf(rol.nombre)}
                      </h2>
                      {protegido && (
                        <Lock size={12} className="shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {rol.descripcion ?? 'Sin descripción'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold',
                      rol.activo
                        ? 'border-success/25 bg-success/10 text-success'
                        : 'border-border bg-muted text-muted-foreground',
                    )}
                  >
                    {rol.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users size={12} /> {rol._count.usuarios} usuario
                    {rol._count.usuarios === 1 ? '' : 's'}
                  </span>
                  <span>Nivel {rol.nivel}</span>
                  <span>{rol.permisos.length} permisos</span>
                </div>

                {rol.permisos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {rol.permisos.slice(0, 6).map(({ permiso }) => (
                      <span
                        key={permiso.id}
                        className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {permiso.nombre}
                      </span>
                    ))}
                    {rol.permisos.length > 6 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        +{rol.permisos.length - 6}
                      </span>
                    )}
                  </div>
                )}

                {esSuperadmin && (
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAsignando(rol)}
                      className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary-text transition-colors hover:bg-primary/20"
                    >
                      <Shield size={12} /> Permisos
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(rol)}
                      className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                    {!protegido && (
                      <button
                        type="button"
                        onClick={() => void eliminar(rol)}
                        className="flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Bones>

      <Pagination
        page={pagina}
        totalPages={totalPaginas}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={irAPagina}
      />

      {creando && (
        <RolFormModal
          onClose={() => setCreando(false)}
          onDone={() => {
            setCreando(false);
            recargar();
          }}
        />
      )}

      {editando && (
        <RolFormModal
          rol={editando}
          onClose={() => setEditando(null)}
          onDone={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}

      {asignando && (
        <PermisosModal
          rol={asignando}
          catalogo={catalogo}
          onClose={() => setAsignando(null)}
          onDone={() => {
            setAsignando(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// ALTA / EDICION DE ROL
// ============================================================

function RolFormModal({
  rol,
  onClose,
  onDone,
}: {
  rol?: Rol;
  onClose: () => void;
  onDone: () => void;
}) {
  const isCreate = !rol;
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '');
  const [nivel, setNivel] = useState(rol?.nivel ?? 10);
  const [activo, setActivo] = useState(rol?.activo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        await rolesApi.createRol({
          nombre: nombre.trim().toUpperCase(),
          descripcion: descripcion.trim() || undefined,
          nivel,
        });
        toast.success('Rol creado');
      } else {
        // El backend no permite renombrar: UpdateRolDto no expone `nombre`.
        // La descripcion se envia aunque este vacia, para poder borrarla.
        await rolesApi.updateRol(rol.id, {
          descripcion: descripcion.trim(),
          nivel,
          activo,
        });
        toast.success('Rol actualizado');
      }
      onDone();
    } catch (e) {
      setError(errMsg(e, 'No se pudo guardar el rol.'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-md surface-overlay p-6 animate-scale-in">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {isCreate ? 'NUEVO ROL' : `EDITAR ${rol.nombre}`}
          </h3>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="r-nombre" className={labelClass}>
              Nombre {!isCreate && '(no editable)'}
            </label>
            <input
              id="r-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={!isCreate}
              placeholder="INVENTARIO"
              required
              className={cn(inputClass, !isCreate && 'cursor-not-allowed opacity-60')}
            />
          </div>

          <div>
            <label htmlFor="r-desc" className={labelClass}>
              Descripción
            </label>
            <input
              id="r-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Encargado de inventario"
              className={inputClass}
            />
          </div>

          <div className={cn('grid gap-3', isCreate ? 'grid-cols-1' : 'grid-cols-2')}>
            <div>
              <label htmlFor="r-nivel" className={labelClass}>
                Nivel (1–99)
              </label>
              <input
                id="r-nivel"
                type="number"
                min={1}
                max={99}
                value={nivel}
                onChange={(e) => setNivel(Number(e.target.value))}
                required
                className={inputClass}
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Referencia: ADMIN = 50, empleados = 10.
              </p>
            </div>

            {!isCreate && (
              <div>
                <label htmlFor="r-activo" className={labelClass}>
                  Estado
                </label>
                <select
                  id="r-activo"
                  value={activo ? '1' : '0'}
                  onChange={(e) => setActivo(e.target.value === '1')}
                  className={inputClass}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-10 flex-1 rounded-lg border border-border bg-muted/60 text-sm text-foreground transition-colors hover:bg-muted">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="h-10 flex-1 rounded-lg bg-primary text-sm font-bold tracking-wide text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'GUARDANDO…' : isCreate ? 'CREAR' : 'GUARDAR'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// ASIGNACION DE PERMISOS (PUT = reemplazo total)
// ============================================================

function PermisosModal({
  rol,
  catalogo,
  onClose,
  onDone,
}: {
  rol: Rol;
  catalogo: PermisosAgrupados;
  onClose: () => void;
  onDone: () => void;
}) {
  const [seleccion, setSeleccion] = useState<Set<string>>(
    () => new Set(rol.permisos.map((p) => p.permiso.id)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleModulo = (items: Permiso[]) => {
    const todos = items.every((p) => seleccion.has(p.id));
    setSeleccion((prev) => {
      const next = new Set(prev);
      items.forEach((p) => (todos ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  };

  const guardar = async () => {
    setSaving(true);
    setError(null);
    try {
      // PUT reemplaza la lista completa: se envia el set entero, no un delta.
      await rolesApi.assignPermisos(rol.id, { permisoIds: [...seleccion] });
      toast.success(`Permisos de ${rol.nombre} actualizados`);
      onDone();
    } catch (e) {
      setError(errMsg(e, 'No se pudieron asignar los permisos.'));
      setSaving(false);
    }
  };

  const modulos = Object.entries(catalogo).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col surface-overlay animate-scale-in">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Permisos de {nameOf(rol.nombre)}
            </h3>
            <p className="text-xs text-muted-foreground">
              {seleccion.size} seleccionados · se reemplaza la lista completa
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {modulos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No se pudo cargar el catálogo de permisos.
            </p>
          )}
          {modulos.map(([modulo, items]) => {
            const todos = items.every((p) => seleccion.has(p.id));
            return (
              <div key={modulo}>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {modulo}
                  </h4>
                  <button
                    type="button"
                    onClick={() => toggleModulo(items)}
                    className="text-[11px] font-medium text-primary-text hover:underline"
                  >
                    {todos ? 'Quitar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5 transition-colors hover:bg-muted/60"
                    >
                      <input
                        type="checkbox"
                        checked={seleccion.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block font-mono text-xs text-foreground">
                          {p.nombre}
                        </span>
                        {p.descripcion && (
                          <span className="block text-[11px] text-muted-foreground">
                            {p.descripcion}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border p-5">
          {error && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="h-10 flex-1 rounded-lg border border-border bg-muted/60 text-sm text-foreground transition-colors hover:bg-muted">
              Cancelar
            </button>
            <button type="button" onClick={() => void guardar()} disabled={saving} className="h-10 flex-1 rounded-lg bg-primary text-sm font-bold tracking-wide text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'GUARDANDO…' : 'GUARDAR PERMISOS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
