'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Lock, Pencil, Plus, Shield, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Bones, BoneTable } from '@/components/shared/bones';
import { ConfirmModal } from '@/components/shared/confirm-modal';
import { ModalShell } from '@/components/shared/modal-shell';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SearchBar } from '@/components/shared/search-bar';
import { StatCard } from '@/components/shared/stat-card';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { ApiError, permisosApi, rolesApi } from '@/lib/api';
import { hasPermission } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { Permiso, PermisosAgrupados, Rol } from '@/types/api';

type RoleModalState = { mode: 'create' } | { mode: 'edit'; role: Rol };

const PROTECTED_ROLES = ['SUPERADMIN', 'ADMIN', 'CAJERO', 'MOZO', 'COCINA', 'BARTENDER'];
const PAGE_SIZE = 25;

const roleFilters = [
  { value: 'todos', label: 'Todos los roles' },
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'base', label: 'Roles base' },
  { value: 'personalizados', label: 'Personalizados' },
];

const moduleLabels: Record<string, string> = {
  usuarios: 'Usuarios',
  roles: 'Roles',
  permisos: 'Permisos',
  audit: 'Auditoría',
  establecimientos: 'Establecimientos',
};

function isProtected(role: Rol) {
  return PROTECTED_ROLES.includes(role.nombre);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide',
        active
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-border bg-muted text-muted-foreground',
      )}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export default function RolesPage() {
  const permisos = useAuthStore((state) => state.permisos);
  const currentRole = useAuthStore((state) => state.user?.rol);
  const boneyardBuild = useBoneyardBuild();
  const isSuperadmin = boneyardBuild || currentRole === 'SUPERADMIN';
  const canRead = boneyardBuild || hasPermission(permisos, 'roles:leer');

  const [roles, setRoles] = useState<Rol[]>([]);
  const [catalog, setCatalog] = useState<PermisosAgrupados>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('todos');
  const [roleModal, setRoleModal] = useState<RoleModalState | null>(null);
  const [permissionRole, setPermissionRole] = useState<Rol | null>(null);
  const [deleteRole, setDeleteRole] = useState<Rol | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    rolesApi
      .listRoles({ pagina: page, limite: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setRoles(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPaginas || 1);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError, 'No se pudieron cargar los roles.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  useEffect(() => {
    let cancelled = false;
    permisosApi
      .listPermisosAgrupados()
      .then((result) => {
        if (!cancelled) setCatalog(result);
      })
      .catch(() => {
        if (!cancelled) setCatalog({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((value) => value + 1);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  }, []);

  const catalogSize = useMemo(
    () => Object.values(catalog).reduce((sum, permissions) => sum + permissions.length, 0),
    [catalog],
  );
  const activeRoles = roles.filter((role) => role.activo).length;
  const baseRoles = roles.filter(isProtected).length;
  const assignedUsers = roles.reduce((sum, role) => sum + role._count.usuarios, 0);
  const assignedPermissions = roles.reduce((sum, role) => sum + role.permisos.length, 0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRoles = roles.filter((role) => {
    const base = isProtected(role);
    const matchesQuery =
      !normalizedQuery ||
      role.nombre.toLowerCase().includes(normalizedQuery) ||
      (role.descripcion ?? '').toLowerCase().includes(normalizedQuery);
    const matchesFilter =
      filter === 'todos' ||
      (filter === 'activos' && role.activo) ||
      (filter === 'inactivos' && !role.activo) ||
      (filter === 'base' && base) ||
      (filter === 'personalizados' && !base);
    return matchesQuery && matchesFilter;
  });

  const confirmDelete = async () => {
    if (!deleteRole || isProtected(deleteRole) || deleting) return;
    setDeleting(true);
    try {
      await rolesApi.deleteRol(deleteRole.id);
      toast.success(`Rol ${deleteRole.nombre} eliminado`);
      setDeleteRole(null);
      reload();
    } catch (requestError) {
      toast.error(errorMessage(requestError, 'No se pudo eliminar el rol.'));
    } finally {
      setDeleting(false);
    }
  };

  if (!canRead) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">No tienes permiso para ver los roles.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
<main className="space-y-4 p-3 sm:p-4 lg:space-y-5 lg:p-6">
        <PageHeader
          title="Roles y acceso"
          subtitle="Administra niveles de acceso y permisos por función operativa."
          action={isSuperadmin ? (
            <button
              type="button"
              onClick={() => setRoleModal({ mode: 'create' })}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
            >
              <Plus size={16} /> NUEVO ROL
            </button>
          ) : undefined}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="ROLES ACTIVOS"
            value={`${activeRoles}/${roles.length}`}
            subtitle="Página actual"
            icon={<Shield size={15} />}
            valueColor="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="ROLES BASE"
            value={String(baseRoles)}
            subtitle="Página actual"
            icon={<Lock size={15} />}
            valueColor="text-purple-500"
          />
          <StatCard
            label="USUARIOS ASIGNADOS"
            value={String(assignedUsers)}
            subtitle="Página actual"
            icon={<Users size={15} />}
          />
          <StatCard
            label="ASIGNACIONES"
            value={String(assignedPermissions)}
            subtitle={`${catalogSize} permisos en catálogo`}
            icon={<KeyRound size={15} />}
            valueColor="text-amber-600 dark:text-amber-400"
          />
        </div>

        {!isSuperadmin && (
          <p className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            Solo un SUPERADMIN puede crear, editar, eliminar o asignar permisos a los roles.
          </p>
        )}

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Filtrar esta página por nombre o descripción..."
            className="w-full sm:max-w-sm"
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filtrar roles"
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-amber-500/50 sm:ml-auto"
          >
            {roleFilters.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <Bones
          name="roles-listado"
          loading={loading}
          placeholder={<BoneTable rows={7} cols={6} />}
        >
          {filteredRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-4 py-14 text-center">
              <Shield size={26} className="mb-3 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Sin roles coincidentes</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prueba con otra búsqueda o cambia el filtro seleccionado.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/35">
                        {['Rol', 'Estado', 'Nivel', 'Usuarios', 'Permisos', 'Acciones'].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRoles.map((role) => {
                        const base = isProtected(role);
                        return (
                          <tr key={role.id} className="transition-colors hover:bg-muted/25">
                            <td className="max-w-xs px-4 py-4">
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border',
                                    base
                                      ? 'border-purple-500/20 bg-purple-500/10 text-purple-500'
                                      : 'border-amber-500/20 bg-amber-500/10 text-amber-500',
                                  )}
                                >
                                  {base ? <Shield size={17} /> : <KeyRound size={17} />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-foreground">{role.nombre}</p>
                                    {base && (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-500">
                                        <Lock size={9} /> Base
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                    {role.descripcion ?? 'Sin descripción'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4"><StatusBadge active={role.activo} /></td>
                            <td className="w-32 px-4 py-4">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-bold text-foreground">{role.nivel}</span>
                                <span className="text-muted-foreground">/ 100</span>
                              </div>
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-amber-500" style={{ width: `${role.nivel}%` }} />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-foreground">
                                <Users size={14} className="text-muted-foreground" /> {role._count.usuarios}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="font-mono font-semibold text-foreground">{role.permisos.length}</span>
                              <span className="text-xs text-muted-foreground"> / {catalogSize}</span>
                            </td>
                            <td className="px-4 py-4">
                              {isSuperadmin ? (
                                <RoleActions
                                  role={role}
                                  onEdit={() => setRoleModal({ mode: 'edit', role })}
                                  onPermissions={() => setPermissionRole(role)}
                                  onDelete={() => !base && setDeleteRole(role)}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">Solo lectura</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:hidden">
                {filteredRoles.map((role) => {
                  const base = isProtected(role);
                  return (
                    <article
                      key={role.id}
                      className={cn(
                        'rounded-xl border bg-card p-4',
                        base ? 'border-purple-500/20' : 'border-border',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border',
                            base
                              ? 'border-purple-500/20 bg-purple-500/10 text-purple-500'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-500',
                          )}
                        >
                          {base ? <Shield size={18} /> : <KeyRound size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold text-foreground">{role.nombre}</h2>
                            {base && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-purple-500">
                                <Lock size={9} /> Base
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {role.descripcion ?? 'Sin descripción'}
                          </p>
                        </div>
                        <StatusBadge active={role.activo} />
                      </div>

                      <div className="my-4 grid grid-cols-3 gap-2">
                        <MobileMetric label="Nivel" value={String(role.nivel)} />
                        <MobileMetric label="Usuarios" value={String(role._count.usuarios)} />
                        <MobileMetric label="Permisos" value={`${role.permisos.length}/${catalogSize}`} />
                      </div>

                      {isSuperadmin && (
                        <RoleActions
                          role={role}
                          onEdit={() => setRoleModal({ mode: 'edit', role })}
                          onPermissions={() => setPermissionRole(role)}
                          onDelete={() => !base && setDeleteRole(role)}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </Bones>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={goToPage}
        />
      </main>

      {roleModal && (
        <RoleFormModal
          state={roleModal}
          roles={roles}
          onClose={() => setRoleModal(null)}
          onDone={() => {
            setRoleModal(null);
            reload();
          }}
        />
      )}

      {permissionRole && (
        <PermissionAssignmentModal
          role={permissionRole}
          catalog={catalog}
          onClose={() => setPermissionRole(null)}
          onDone={() => {
            setPermissionRole(null);
            reload();
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(deleteRole)}
        title="Eliminar rol personalizado"
        description={(
          <span>
            El rol <strong className="text-foreground">{deleteRole?.nombre}</strong> se eliminará del sistema.
            {Boolean(deleteRole?._count?.usuarios) && ' Revisa primero los usuarios que todavía lo tienen asignado.'}
          </span>
        )}
        confirmLabel={deleting ? 'Eliminando...' : 'Eliminar rol'}
        variant="danger"
        onClose={() => {
          if (!deleting) setDeleteRole(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2 text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function RoleActions({
  role,
  onEdit,
  onPermissions,
  onDelete,
}: {
  role: Rol;
  onEdit: () => void;
  onPermissions: () => void;
  onDelete: () => void;
}) {
  const base = isProtected(role);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onPermissions}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
      >
        <KeyRound size={13} /> Permisos
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Pencil size={13} /> Editar
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={base}
        title={base ? 'Los roles base no se pueden eliminar' : 'Eliminar rol'}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted/40 disabled:text-muted-foreground disabled:opacity-55"
      >
        {base ? <Lock size={13} /> : <Trash2 size={13} />}
        {base ? 'Protegido' : 'Eliminar'}
      </button>
    </div>
  );
}

function RoleFormModal({
  state,
  roles,
  onClose,
  onDone,
}: {
  state: RoleModalState;
  roles: Rol[];
  onClose: () => void;
  onDone: () => void;
}) {
  const role = state.mode === 'edit' ? state.role : null;
  const isSuperadminRole = role?.nombre === 'SUPERADMIN';
  const [name, setName] = useState(role?.nombre ?? '');
  const [description, setDescription] = useState(role?.descripcion ?? '');
  const [level, setLevel] = useState(role?.nivel ?? 20);
  const [active, setActive] = useState(role?.activo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim().toUpperCase();
    const duplicate = roles.some(
      (item) => item.id !== role?.id && item.nombre.toUpperCase() === normalizedName,
    );

    if (!normalizedName) {
      setError('Completa el nombre del rol.');
      return;
    }
    if (duplicate) {
      setError('Ya existe un rol con este nombre.');
      return;
    }
    if (level < 1 || level > 99) {
      setError('El nivel debe estar entre 1 y 99.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (role) {
        await rolesApi.updateRol(role.id, {
          descripcion: description.trim(),
          nivel: isSuperadminRole ? role.nivel : level,
          activo: isSuperadminRole ? true : active,
        });
        toast.success('Rol actualizado');
      } else {
        await rolesApi.createRol({
          nombre: normalizedName,
          descripcion: description.trim() || undefined,
          nivel: level,
        });
        toast.success('Rol creado');
      }
      onDone();
    } catch (requestError) {
      setError(errorMessage(requestError, 'No se pudo guardar el rol.'));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open
      title={role ? 'Editar rol' : 'Crear rol'}
      subtitle={role ? `Actualiza la configuración de ${role.nombre}.` : 'Define un rol personalizado para tu operación.'}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {role && (
          <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 text-sm">
            <Lock size={17} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-foreground">Nombre protegido</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                El nombre no puede modificarse después de crear el rol. Los roles base tampoco pueden eliminarse.
              </p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="role-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nombre del rol
          </label>
          <input
            id="role-name"
            value={name}
            onChange={(event) => setName(event.target.value.toUpperCase())}
            disabled={Boolean(role)}
            required
            placeholder="Ej: SUPERVISOR"
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-amber-500/60 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="role-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Descripción
          </label>
          <textarea
            id="role-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Responsabilidades principales de este rol..."
            className="mt-1.5 w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-amber-500/60"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="role-level" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nivel jerárquico
            </label>
            <input
              id="role-level"
              type="number"
              min={1}
              max={99}
              value={level}
              onChange={(event) => setLevel(Number(event.target.value))}
              disabled={isSuperadminRole}
              required
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-muted/50 px-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-amber-500/60 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Rango permitido: 1-99. El nivel 100 está reservado.
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</span>
            <label
              className={cn(
                'mt-1.5 flex h-10 items-center justify-between rounded-lg border border-border bg-muted/50 px-3',
                isSuperadminRole && 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="text-sm text-foreground">{active ? 'Activo' : 'Inactivo'}</span>
              <input
                type="checkbox"
                checked={active}
                disabled={!role || isSuperadminRole}
                onChange={(event) => setActive(event.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-xl border border-border bg-muted/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-xl bg-amber-500 px-5 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? 'GUARDANDO...' : role ? 'GUARDAR CAMBIOS' : 'CREAR ROL'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function PermissionAssignmentModal({
  role,
  catalog,
  onClose,
  onDone,
}: {
  role: Rol;
  catalog: PermisosAgrupados;
  onClose: () => void;
  onDone: () => void;
}) {
  const locked = role.nombre === 'SUPERADMIN';
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role.permisos.map(({ permiso }) => permiso.id)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const modules = Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b));
  const allPermissions = Object.values(catalog).flat();
  const allSelected = allPermissions.length > 0 && allPermissions.every((permission) => selected.has(permission.id));

  const togglePermission = (permission: Permiso, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(permission.id);
      else next.delete(permission.id);
      return next;
    });
  };

  const toggleModule = (permissions: Permiso[], checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      permissions.forEach((permission) => {
        if (checked) next.add(permission.id);
        else next.delete(permission.id);
      });
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(allPermissions.map((permission) => permission.id)) : new Set());
  };

  const save = async () => {
    if (locked) return;
    setSaving(true);
    setError('');
    try {
      await rolesApi.assignPermisos(role.id, { permisoIds: [...selected] });
      toast.success(`Permisos de ${role.nombre} actualizados`);
      onDone();
    } catch (requestError) {
      setError(errorMessage(requestError, 'No se pudieron asignar los permisos.'));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open
      title="Asignar permisos"
      subtitle={`${role.nombre} tiene ${selected.size} de ${allPermissions.length} permisos.`}
      onClose={onClose}
      className="max-w-3xl"
    >
      {locked && (
        <div className="mb-4 flex gap-3 rounded-xl border border-purple-500/25 bg-purple-500/8 p-3">
          <Lock size={17} className="mt-0.5 flex-shrink-0 text-purple-500" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            SUPERADMIN conserva todos los permisos por diseño. La matriz se muestra como referencia y no puede modificarse.
          </p>
        </div>
      )}

      <label
        className={cn(
          'mb-4 flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3',
          locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
        )}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Acceso completo</p>
          <p className="text-xs text-muted-foreground">Selecciona todos los permisos disponibles.</p>
        </div>
        <input
          type="checkbox"
          checked={allSelected}
          disabled={locked}
          onChange={(event) => toggleAll(event.target.checked)}
          className="h-4 w-4 accent-amber-500"
        />
      </label>

      {modules.length === 0 ? (
        <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          No se pudo cargar el catálogo de permisos.
        </p>
      ) : (
        <div className="space-y-3">
          {modules.map(([module, permissions]) => {
            const selectedInModule = permissions.filter((permission) => selected.has(permission.id)).length;
            const moduleSelected = permissions.length > 0 && selectedInModule === permissions.length;
            return (
              <section key={module} className="overflow-hidden rounded-xl border border-border bg-card">
                <label
                  className={cn(
                    'flex items-center justify-between border-b border-border bg-muted/45 px-4 py-3',
                    locked ? 'cursor-not-allowed' : 'cursor-pointer',
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{moduleLabels[module] ?? module}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedInModule} de {permissions.length} asignados
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={moduleSelected}
                    disabled={locked}
                    onChange={(event) => toggleModule(permissions, event.target.checked)}
                    className="h-4 w-4 accent-amber-500"
                  />
                </label>

                <div className="divide-y divide-border">
                  {permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 transition-colors',
                        locked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted/30',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(permission.id)}
                        disabled={locked}
                        onChange={(event) => togglePermission(permission, event.target.checked)}
                        className="mt-0.5 h-4 w-4 flex-shrink-0 accent-amber-500"
                      />
                      <span className="min-w-0">
                        <code className="break-all text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {permission.nombre}
                        </code>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {permission.descripcion ?? 'Sin descripción'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>}

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{selected.size} permisos seleccionados</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 flex-1 rounded-xl border border-border bg-muted/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:flex-none"
          >
            {locked ? 'Cerrar' : 'Cancelar'}
          </button>
          {!locked && (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="h-10 flex-1 rounded-xl bg-amber-500 px-5 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50 sm:flex-none"
            >
              {saving ? 'GUARDANDO...' : 'GUARDAR PERMISOS'}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
