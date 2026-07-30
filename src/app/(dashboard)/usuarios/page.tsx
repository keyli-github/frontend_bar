'use client';

/**
 * Gestion de usuarios — conectada a `UsuariosController` y `RolesController`.
 *
 *   GET    /api/usuarios?pagina&limite
 *   POST   /api/usuarios
 *   PATCH  /api/usuarios/:id
 *   DELETE /api/usuarios/:id                    (soft-delete: activo = false)
 *   POST   /api/usuarios/:id/resetear-password
 *   GET    /api/roles                            (selector de rol + conteos)
 *
 * Reglas que aplica el backend y que la UI refleja:
 *   - Un ADMIN solo ve y crea usuarios de su propia sede (la fuerza el servidor).
 *   - No se puede crear un SUPERADMIN desde la API.
 *   - Nadie puede asignar un rol de nivel >= al suyo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pagination } from '@/components/shared/pagination';
import { useAuthStore } from '@/store/auth-store';
import { usuariosApi, rolesApi, establecimientosApi, ApiError } from '@/lib/api';
import {
  getRoleLabel,
  hasPermission,
  roleAvatarClass,
  roleBadgeClass,
  isUserRole,
} from '@/lib/roles';
import type { Establecimiento, Rol, Usuario } from '@/types/api';
import { Search, Plus, X, KeyRound, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bones, BoneKpis, BoneTable } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';

const PAGE_SIZE = 25;

const inputClass =
  'w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all text-sm';
const labelClass = 'text-xs text-muted-foreground uppercase tracking-wider';

const initialsOf = (u: Usuario) =>
  u.username.trim().slice(0, 2).toUpperCase() || '?';

/** Estilo del badge por nombre de rol; los roles a medida caen en un gris neutro. */
const badgeFor = (nombre: string) =>
  isUserRole(nombre) ? roleBadgeClass[nombre] : 'bg-muted border-border text-muted-foreground';

const avatarFor = (nombre: string) =>
  isUserRole(nombre) ? roleAvatarClass[nombre] : 'bg-muted-foreground';

const labelFor = getRoleLabel;

export default function UsuariosPage() {
  const permisos = useAuthStore((s) => s.permisos);
  const currentUser = useAuthStore((s) => s.user);
  const boneyardBuild = useBoneyardBuild();

  const canCreate = boneyardBuild || hasPermission(permisos, 'usuarios:crear');
  const canEdit = boneyardBuild || hasPermission(permisos, 'usuarios:editar');
  const canDelete = boneyardBuild || hasPermission(permisos, 'usuarios:eliminar');
  const canReset =
    boneyardBuild || hasPermission(permisos, 'usuarios:resetear-password');
  const isSuperadmin = boneyardBuild || currentUser?.rol === 'SUPERADMIN';

  // ── Datos ─────────────────────────────────────────────────
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [sedes, setSedes] = useState<Establecimiento[]>([]);
  /** Avisos de catalogos que no cargaron: sin ellos no se puede crear usuarios. */
  const [catalogoError, setCatalogoError] = useState<string | null>(null);
  const [catalogosCargando, setCatalogosCargando] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Se incrementa para forzar una recarga tras crear/editar/desactivar. */
  const [reloadToken, setReloadToken] = useState(0);

  // El backend no acepta parametro de busqueda todavia, asi que el filtro
  // actua solo sobre la pagina cargada. Se avisa en la UI para no enganar.
  const [search, setSearch] = useState('');

  /**
   * La carga se hace en callbacks de la promesa, no en el cuerpo del efecto:
   * React 19 marca como error llamar a setState sincronamente dentro de un
   * efecto (`react-hooks/set-state-in-effect`). El flag `cancelled` ademas
   * descarta respuestas de paginas que ya no son la actual.
   */
  useEffect(() => {
    let cancelled = false;

    usuariosApi
      .listUsuarios({ pagina, limite: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setUsuarios(res.data);
        setTotal(res.total);
        setTotalPaginas(res.totalPaginas || 1);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : 'No se pudieron cargar los usuarios.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pagina, reloadToken]);

  useEffect(() => {
    // Catalogos del formulario de alta. Si alguno falla se avisa: antes el
    // error se tragaba y el <select required> quedaba vacio sin explicacion.
    let cancelled = false;

    Promise.allSettled([
      rolesApi.listRoles({ limite: 100 }),
      establecimientosApi.listEstablecimientos({ limite: 100 }),
    ]).then(([resRoles, resSedes]) => {
      if (cancelled) return;

      const fallos: string[] = [];
      if (resRoles.status === 'fulfilled') setRoles(resRoles.value.data);
      else fallos.push('roles');
      if (resSedes.status === 'fulfilled') setSedes(resSedes.value.data);
      else fallos.push('sedes');

      setCatalogoError(
        fallos.length
          ? `No se pudieron cargar los catálogos de ${fallos.join(' y ')}. No podrás crear usuarios.`
          : null,
      );
      setCatalogosCargando(false);
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

  const visibles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => u.username.toLowerCase().includes(q));
  }, [usuarios, search]);

  /** Roles asignables: nunca SUPERADMIN, y nunca por encima del propio nivel. */
  const rolesAsignables = useMemo(
    () =>
      roles.filter(
        (r) =>
          r.activo &&
          r.nombre !== 'SUPERADMIN' &&
          (isSuperadmin || r.nivel < (currentUser?.nivel ?? 0)),
      ),
    [roles, isSuperadmin, currentUser],
  );

  /**
   * Sedes para el selector, desde `GET /establecimientos`.
   *
   * Antes se deducian de los usuarios ya cargados, con dos fallos: una sede
   * recien creada no aparecia hasta tener a alguien dentro, y con la lista
   * vacia el <select required> se quedaba sin opciones, impidiendo crear
   * usuarios. Solo se activan las sedes activas.
   */
  const sedesActivas = useMemo(() => sedes.filter((s) => s.activo), [sedes]);

  // ── Modales ───────────────────────────────────────────────
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);

  const afterMutation = (message: string) => {
    toast.success(message);
    recargar();
  };

  const handleDeactivate = async (u: Usuario) => {
    if (!confirm(`¿Desactivar la cuenta ${u.username}?`)) return;
    try {
      await usuariosApi.deactivateUsuario(u.id);
      afterMutation('Usuario desactivado.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo desactivar.');
    }
  };

  /** Revierte el soft-delete de `DELETE /usuarios/:id`. */
  const handleReactivate = async (u: Usuario) => {
    try {
      await usuariosApi.updateUsuario(u.id, { activo: true });
      afterMutation(`Cuenta ${u.username} reactivada.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo reactivar.');
    }
  };

  const handleReset = async (u: Usuario) => {
    if (!confirm(`¿Resetear la contraseña de ${u.username}?`)) return;
    try {
      const res = await usuariosApi.resetPasswordUsuario(u.id);
      // La contrasena temporal solo se muestra una vez: el toast no
      // autodesaparece para que el administrador pueda copiarla.
      toast.success(`Contraseña temporal de ${u.username}`, {
        description: res.tempPassword,
        duration: Infinity,
        action: {
          label: 'Copiar',
          onClick: () => void navigator.clipboard?.writeText(res.tempPassword),
        },
      });
      recargar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo resetear.');
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} usuario{total === 1 ? '' : 's'} en tu ámbito
            {!isSuperadmin && currentUser?.sede ? ` · ${currentUser.sede}` : ''}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm tracking-wide transition-all active:scale-[0.98] w-fit"
          >
            <Plus size={16} />
            NUEVO USUARIO
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
        >
          <AlertCircle size={15} /> {error}
        </p>
      )}

      {catalogoError && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning/10 px-4 py-2.5 text-sm text-warning"
        >
          <AlertCircle size={15} /> {catalogoError}
        </p>
      )}

      {/* ── KPIs por rol (conteo global desde /roles) ── */}
      {(catalogosCargando || roles.length > 0) && (
        <Bones
          name="usuarios-kpis"
          loading={catalogosCargando}
          placeholder={<BoneKpis count={4} />}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
            {roles.slice(0, 4).map((r) => (
              <div key={r.id} className="surface px-3 py-2 lg:px-4 lg:py-3">
                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                  {labelFor(r.nombre)}
                </p>
                <p className="text-base lg:text-lg font-bold font-mono mt-1 text-foreground">
                  {r._count.usuarios}
                </p>
              </div>
            ))}
          </div>
        </Bones>
      )}

      {/* ── Busqueda ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up">
        <div className="relative max-w-xs flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por username…"
            aria-label="Filtrar usuarios de esta página"
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 text-sm transition-all"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          El filtro se aplica a los {usuarios.length} usuarios de esta página.
        </p>
      </div>

      {/* ── Tabla ── */}
      <div className="surface overflow-hidden animate-fade-in-up">
        <Bones
          name="usuarios-tabla"
          loading={loading}
          placeholder={<BoneTable rows={8} cols={5} />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Cuenta', 'Rol', 'Sede', 'Estado', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No hay usuarios que mostrar.
                  </td>
                </tr>
              ) : (
                visibles.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
                            avatarFor(u.rol.nombre),
                          )}
                        >
                          {initialsOf(u)}
                        </div>
                        <span className="font-mono text-xs font-medium text-foreground">
                          {u.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded border text-[10px] font-bold uppercase',
                          badgeFor(u.rol.nombre),
                        )}
                      >
                        {u.rol.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {u.sede?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            u.activo ? 'bg-success' : 'bg-muted-foreground',
                          )}
                        />
                        <span
                          className={cn(
                            'text-xs',
                            u.activo ? 'text-success' : 'text-muted-foreground',
                          )}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setEditing(u)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary-text text-xs font-medium hover:bg-primary/20 transition-colors"
                          >
                            Editar
                          </button>
                        )}
                        {canReset && (
                          <button
                            type="button"
                            onClick={() => void handleReset(u)}
                            title="Resetear contraseña"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-muted-foreground text-xs font-medium hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <KeyRound size={12} /> Reset
                          </button>
                        )}
                        {canDelete && u.activo && u.rol.nombre !== 'SUPERADMIN' && (
                          <button
                            type="button"
                            onClick={() => void handleDeactivate(u)}
                            className="px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                          >
                            Desactivar
                          </button>
                        )}
                        {canEdit && !u.activo && (
                          <button
                            type="button"
                            onClick={() => void handleReactivate(u)}
                            className="rounded-lg border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20"
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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

      {showNew && (
        <UsuarioFormModal
          mode="create"
          roles={rolesAsignables}
          sedes={sedesActivas}
          showSede={isSuperadmin}
          onClose={() => setShowNew(false)}
          onDone={(msg) => {
            setShowNew(false);
            afterMutation(msg);
          }}
        />
      )}

      {editing && (
        <UsuarioFormModal
          mode="edit"
          usuario={editing}
          roles={rolesAsignables}
          sedes={sedesActivas}
          showSede={isSuperadmin}
          onClose={() => setEditing(null)}
          onDone={(msg) => {
            setEditing(null);
            afterMutation(msg);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL DE ALTA / EDICION
// ============================================================

interface FormModalProps {
  mode: 'create' | 'edit';
  usuario?: Usuario;
  roles: Rol[];
  sedes: { id: string; nombre: string }[];
  /** Solo SUPERADMIN elige sede; para el resto la impone el backend. */
  showSede: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}

function UsuarioFormModal({
  mode,
  usuario,
  roles,
  sedes,
  showSede,
  onClose,
  onDone,
}: FormModalProps) {
  const [username, setUsername] = useState(usuario?.username ?? '');
  const [password, setPassword] = useState('');
  const [rolId, setRolId] = useState(usuario?.rol.id ?? '');
  const [sedeId, setSedeId] = useState(usuario?.sede?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreate = mode === 'create';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        await usuariosApi.createUsuario({
          username: username.trim(),
          password,
          rolId,
          ...(showSede && sedeId ? { sedeId } : {}),
        });
        onDone('Usuario creado.');
      } else {
        await usuariosApi.updateUsuario(usuario!.id, {
          ...(rolId && rolId !== usuario!.rol.id ? { rolId } : {}),
          ...(showSede && sedeId && sedeId !== usuario!.sede?.id ? { sedeId } : {}),
        });
        onDone('Usuario actualizado.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isCreate ? 'Nuevo usuario' : 'Editar usuario'}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md surface-overlay p-6 animate-scale-in"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-foreground text-lg">
            {isCreate ? 'NUEVO USUARIO' : 'EDITAR USUARIO'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="f-username" className={labelClass}>
              Username {isCreate ? '' : '(no editable)'}
            </label>
            <input
              id="f-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="cajero01"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={100}
              disabled={!isCreate}
              required
              className={cn(inputClass, !isCreate && 'cursor-not-allowed opacity-60')}
            />
          </div>

          <div className={cn('grid gap-3', showSede ? 'grid-cols-2' : 'grid-cols-1')}>
            <div>
              <label htmlFor="f-rol" className={labelClass}>
                Rol
              </label>
              <select
                id="f-rol"
                value={rolId}
                onChange={(e) => setRolId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="" disabled>
                  Selecciona…
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {labelFor(r.nombre)}
                  </option>
                ))}
              </select>
            </div>

            {showSede && (
              <div>
                <label htmlFor="f-sede" className={labelClass}>
                  Sede
                </label>
                <select
                  id="f-sede"
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  required={isCreate}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Selecciona…
                  </option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isCreate && (
            <div>
              <label htmlFor="f-password" className={labelClass}>
                Contraseña temporal
              </label>
              <input
                id="f-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mín. 12 caracteres, Aa1"
                minLength={12}
                maxLength={72}
                required
                className={inputClass}
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                El usuario deberá cambiarla en su primer acceso.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm tracking-wide transition-all disabled:opacity-50"
            >
              {saving ? 'GUARDANDO…' : isCreate ? 'CREAR USUARIO' : 'GUARDAR'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
