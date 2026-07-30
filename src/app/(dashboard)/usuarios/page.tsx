'use client';

/** Gestion de usuarios conectada a UsuariosController y sus catalogos reales. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Pagination } from '@/components/shared/pagination';
import { ModalShell } from '@/components/shared/modal-shell';
import { Bones, BoneKpis, BoneList, BoneTable } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { useAuthStore } from '@/store/auth-store';
import { establecimientosApi, ApiError, rolesApi, usuariosApi } from '@/lib/api';
import {
  getRoleLabel,
  hasPermission,
  isUserRole,
  roleAvatarClass,
  roleBadgeClass,
} from '@/lib/roles';
import { cn } from '@/lib/utils';
import type { Establecimiento, Rol, Usuario, UsuarioDetalle } from '@/types/api';

const PAGE_SIZE = 25;
const inputClass =
  'mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'text-xs font-medium uppercase tracking-wider text-muted-foreground';

const initialsOf = (usuario: Usuario) =>
  usuario.username.trim().slice(0, 2).toUpperCase() || '?';

const badgeFor = (rol: string) =>
  isUserRole(rol) ? roleBadgeClass[rol] : 'border-border bg-muted text-muted-foreground';

const avatarFor = (rol: string) =>
  isUserRole(rol) ? roleAvatarClass[rol] : 'bg-muted-foreground';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );

type PendingAction = {
  kind: 'deactivate' | 'reset-password';
  usuario: Usuario;
} | null;

interface TemporaryCredential {
  username: string;
  password: string;
}

export default function UsuariosPage() {
  const permisos = useAuthStore((state) => state.permisos);
  const currentUser = useAuthStore((state) => state.user);
  const boneyardBuild = useBoneyardBuild();

  const canRead = boneyardBuild || hasPermission(permisos, 'usuarios:leer');
  const canCreate = boneyardBuild || hasPermission(permisos, 'usuarios:crear');
  const canEdit = boneyardBuild || hasPermission(permisos, 'usuarios:editar');
  const canDelete = boneyardBuild || hasPermission(permisos, 'usuarios:eliminar');
  const canReset =
    boneyardBuild || hasPermission(permisos, 'usuarios:resetear-password');
  const isSuperadmin = boneyardBuild || currentUser?.rol === 'SUPERADMIN';

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [sedes, setSedes] = useState<Establecimiento[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogosCargando, setCatalogosCargando] = useState(true);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [sedeFilter, setSedeFilter] = useState('TODAS');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);

  const [detailUser, setDetailUser] = useState<Usuario | null>(null);
  const [detail, setDetail] = useState<UsuarioDetalle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [temporaryCredential, setTemporaryCredential] =
    useState<TemporaryCredential | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;

    usuariosApi
      .listUsuarios({ pagina, limite: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setUsuarios(result.data);
        setTotal(result.total);
        setTotalPaginas(result.totalPaginas || 1);
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
  }, [canRead, pagina, reloadToken]);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;

    Promise.allSettled([
      rolesApi.listRoles({ limite: 100 }),
      establecimientosApi.listEstablecimientos({ limite: 100 }),
    ]).then(([roleResult, sedeResult]) => {
      if (cancelled) return;
      const failures: string[] = [];

      if (roleResult.status === 'fulfilled') setRoles(roleResult.value.data);
      else failures.push('roles');
      if (sedeResult.status === 'fulfilled') setSedes(sedeResult.value.data);
      else failures.push('sedes');

      setCatalogoError(
        failures.length
          ? `No se pudieron cargar los catálogos de ${failures.join(' y ')}.`
          : null,
      );
      setCatalogosCargando(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canRead]);

  const openDetail = async (usuario: Usuario) => {
    setDetailUser(usuario);
    setDetailLoading(true);
    setDetail(null);
    setDetailError(null);
    try {
      setDetail(await usuariosApi.getUsuario(usuario.id));
    } catch (err) {
        setDetailError(
          err instanceof ApiError ? err.message : 'No se pudo cargar el detalle.',
        );
    } finally {
      setDetailLoading(false);
    }
  };

  const recargar = useCallback(() => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

  const rolesAsignables = useMemo(
    () =>
      roles.filter(
        (rol) =>
          rol.activo &&
          rol.nombre !== 'SUPERADMIN' &&
          (isSuperadmin || rol.nivel < (currentUser?.nivel ?? 0)),
      ),
    [currentUser, isSuperadmin, roles],
  );

  const sedesActivas = useMemo(() => sedes.filter((sede) => sede.activo), [sedes]);

  const visibles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      const matchesSearch = !query || usuario.username.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'TODOS' || usuario.rol.id === roleFilter;
      const matchesSede = sedeFilter === 'TODAS' || usuario.sede?.id === sedeFilter;
      return matchesSearch && matchesRole && matchesSede;
    });
  }, [roleFilter, search, sedeFilter, usuarios]);

  const afterMutation = (message: string) => {
    toast.success(message);
    recargar();
  };

  const handleReactivate = async (usuario: Usuario) => {
    try {
      await usuariosApi.updateUsuario(usuario.id, { activo: true });
      afterMutation(`Cuenta ${usuario.username} reactivada.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo reactivar.');
    }
  };

  const handleConfirmedAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (pendingAction.kind === 'deactivate') {
        await usuariosApi.deactivateUsuario(pendingAction.usuario.id);
        afterMutation(`Cuenta ${pendingAction.usuario.username} desactivada.`);
      } else {
        const result = await usuariosApi.resetPasswordUsuario(pendingAction.usuario.id);
        setTemporaryCredential({
          username: pendingAction.usuario.username,
          password: result.tempPassword,
        });
        recargar();
      }
      setPendingAction(null);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'No se pudo completar la operación.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const copyTemporaryPassword = async () => {
    if (!temporaryCredential) return;
    try {
      await navigator.clipboard.writeText(temporaryCredential.password);
      setCopied(true);
    } catch {
      toast.error('No se pudo copiar. Selecciona la contraseña manualmente.');
    }
  };

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes permiso para ver usuarios.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-5 lg:p-6">
      <div className="flex flex-col gap-3 animate-fade-in-up sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} usuario{total === 1 ? '' : 's'} en tu ámbito
            {!isSuperadmin && currentUser?.sede ? ` · ${currentUser.sede}` : ''}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            disabled={catalogosCargando || Boolean(catalogoError)}
            className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold tracking-wide text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} /> NUEVO USUARIO
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle size={15} /> {error}
        </p>
      )}
      {catalogoError && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          <AlertCircle size={15} /> {catalogoError} No podrás crear o editar usuarios.
        </p>
      )}

      <Bones name="usuarios-kpis" loading={catalogosCargando} placeholder={<BoneKpis count={4} />}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger-children">
          {roles.slice(0, 4).map((rol) => (
            <div key={rol.id} className="surface px-3 py-2 lg:px-4 lg:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {getRoleLabel(rol.nombre)}
              </p>
              <p className="mt-1 font-mono text-base font-bold text-foreground lg:text-lg">
                {rol._count.usuarios}
              </p>
            </div>
          ))}
        </div>
      </Bones>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar username de esta página..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          aria-label="Filtrar por rol"
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary/50"
        >
          <option value="TODOS">Todos los roles</option>
          {roles.map((rol) => <option key={rol.id} value={rol.id}>{getRoleLabel(rol.nombre)}</option>)}
        </select>
        <select
          value={sedeFilter}
          onChange={(event) => setSedeFilter(event.target.value)}
          aria-label="Filtrar por sede"
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary/50"
        >
          <option value="TODAS">Todas las sedes</option>
          {sedes.map((sede) => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        Los filtros se aplican a los {usuarios.length} usuarios de la página cargada.
      </p>

      <div className="surface overflow-hidden animate-fade-in-up">
        <Bones name="usuarios-tabla" loading={loading} placeholder={<BoneTable rows={8} cols={7} />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Cuenta', 'Rol', 'Sede', 'Estado', 'Seguridad', 'Alta', 'Acciones'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No hay usuarios que mostrar.
                    </td>
                  </tr>
                ) : visibles.map((usuario) => (
                  <tr key={usuario.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', avatarFor(usuario.rol.nombre))}>
                          {initialsOf(usuario)}
                        </div>
                        <span className="font-mono text-xs font-medium text-foreground">@{usuario.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold uppercase', badgeFor(usuario.rol.nombre))}>
                        {getRoleLabel(usuario.rol.nombre)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{usuario.sede?.nombre ?? 'Todas'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium', usuario.activo ? 'text-success' : 'text-muted-foreground')}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      Usa “Ver detalle” para consultar el cambio obligatorio.
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(usuario.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => void openDetail(usuario)} className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                          <Eye size={13} /> Detalle
                        </button>
                        {canEdit && (
                          <button type="button" onClick={() => setEditing(usuario)} className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary-text hover:bg-primary/20">
                            Editar
                          </button>
                        )}
                        {canReset && (
                          <button type="button" onClick={() => setPendingAction({ kind: 'reset-password', usuario })} className="flex items-center gap-1 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-500 hover:bg-sky-500/20">
                            <KeyRound size={12} /> Reset
                          </button>
                        )}
                        {canDelete && usuario.activo && usuario.rol.nombre !== 'SUPERADMIN' && (
                          <button type="button" onClick={() => setPendingAction({ kind: 'deactivate', usuario })} className="rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20">
                            Desactivar
                          </button>
                        )}
                        {canEdit && !usuario.activo && (
                          <button type="button" onClick={() => void handleReactivate(usuario)} className="rounded-lg border border-success/20 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success hover:bg-success/20">
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bones>
        <Pagination page={pagina} totalPages={totalPaginas} total={total} pageSize={PAGE_SIZE} onPageChange={irAPagina} className="border-t border-border px-3" />
      </div>

      {showNew && (
        <UsuarioFormModal
          mode="create"
          roles={rolesAsignables}
          sedes={sedesActivas}
          showSede={isSuperadmin}
          onClose={() => setShowNew(false)}
          onDone={(message) => {
            setShowNew(false);
            afterMutation(message);
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
          onDone={(message) => {
            setEditing(null);
            afterMutation(message);
          }}
        />
      )}

      <ModalShell
        open={Boolean(detailUser)}
        title="Detalle del usuario"
        subtitle={detailUser ? `@${detailUser.username}` : undefined}
        onClose={() => setDetailUser(null)}
      >
        {detailError && <p role="alert" className="text-sm text-destructive">{detailError}</p>}
        <Bones name="usuario-detalle" loading={detailLoading} placeholder={<BoneList rows={5} />}>
          {detail && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className={cn('flex size-12 items-center justify-center rounded-full text-sm font-bold text-white', avatarFor(detail.rol.nombre))}>
                  {initialsOf(detail)}
                </div>
                <div>
                  <p className="font-mono font-semibold text-foreground">@{detail.username}</p>
                  <p className="text-sm text-muted-foreground">{getRoleLabel(detail.rol.nombre)}</p>
                </div>
                <span className={cn('ml-auto rounded border px-2 py-0.5 text-[10px] font-bold uppercase', badgeFor(detail.rol.nombre))}>
                  {detail.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Sede', detail.sede?.nombre ?? 'Todas las sedes'],
                  ['Nivel', String(detail.rol.nivel)],
                  ['Creado', formatDate(detail.createdAt)],
                  ['Cambio obligatorio', detail.mustChangePassword ? 'Sí, pendiente' : 'No'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-muted/25 p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                {canEdit && (
                  <button type="button" onClick={() => { setDetailUser(null); setEditing(detail); }} className="h-10 rounded-lg border border-border bg-muted/60 px-4 text-sm font-medium text-foreground hover:bg-muted">
                    Editar usuario
                  </button>
                )}
                {canReset && (
                  <button type="button" onClick={() => { setDetailUser(null); setPendingAction({ kind: 'reset-password', usuario: detail }); }} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                    <KeyRound size={15} /> Resetear contraseña
                  </button>
                )}
              </div>
            </div>
          )}
        </Bones>
      </ModalShell>

      <ModalShell
        open={Boolean(pendingAction)}
        title={pendingAction?.kind === 'deactivate' ? 'Desactivar usuario' : 'Resetear contraseña'}
        subtitle={pendingAction ? `@${pendingAction.usuario.username}` : undefined}
        onClose={() => { if (!actionLoading) { setPendingAction(null); setActionError(null); } }}
      >
        <p className="text-sm leading-6 text-muted-foreground">
          {pendingAction?.kind === 'deactivate'
            ? 'El acceso quedará bloqueado hasta que un administrador reactive la cuenta.'
            : 'La contraseña actual se invalidará y el backend generará una temporal de un solo uso.'}
        </p>
        {actionError && <p role="alert" className="mt-3 text-sm text-destructive">{actionError}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" disabled={actionLoading} onClick={() => { setPendingAction(null); setActionError(null); }} className="h-10 rounded-lg border border-border bg-muted/60 px-4 text-sm text-foreground hover:bg-muted disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" disabled={actionLoading} onClick={() => void handleConfirmedAction()} className={cn('h-10 rounded-lg px-4 text-sm font-bold disabled:opacity-50', pendingAction?.kind === 'deactivate' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground')}>
            {actionLoading ? 'PROCESANDO…' : pendingAction?.kind === 'deactivate' ? 'DESACTIVAR' : 'GENERAR CONTRASEÑA'}
          </button>
        </div>
      </ModalShell>

      <ModalShell
        open={Boolean(temporaryCredential)}
        title="Contraseña temporal generada"
        subtitle="Entrégala al usuario por un canal seguro."
        onClose={() => { setTemporaryCredential(null); setCopied(false); }}
      >
        {temporaryCredential && (
          <div className="space-y-4">
            <p className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
              Se muestra una sola vez. No podrás recuperarla al cerrar este modal.
            </p>
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Username</p>
                <p className="mt-1 font-medium text-foreground">{temporaryCredential.username}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Contraseña temporal</p>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <code className="min-w-0 flex-1 break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm font-bold text-foreground">{temporaryCredential.password}</code>
                  <button type="button" onClick={() => void copyTemporaryPassword()} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-sm font-semibold text-primary-text hover:bg-primary/20">
                    {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiada' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                El usuario tendrá que definir una contraseña nueva en su siguiente inicio de sesión.
              </p>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}

interface UsuarioFormModalProps {
  mode: 'create' | 'edit';
  usuario?: Usuario;
  roles: Rol[];
  sedes: { id: string; nombre: string }[];
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
}: UsuarioFormModalProps) {
  const isCreate = mode === 'create';
  const [username, setUsername] = useState(usuario?.username ?? '');
  const [password, setPassword] = useState('');
  const [rolId, setRolId] = useState(usuario?.rol.id ?? '');
  const [sedeId, setSedeId] = useState(usuario?.sede?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentRoleMissing = Boolean(usuario && !roles.some((rol) => rol.id === usuario.rol.id));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          ...(rolId !== usuario!.rol.id ? { rolId } : {}),
          ...(showSede && sedeId !== usuario!.sede?.id ? { sedeId } : {}),
        });
        onDone('Usuario actualizado.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el usuario.');
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open
      title={isCreate ? 'NUEVO USUARIO' : 'EDITAR USUARIO'}
      subtitle={isCreate ? 'Crea el acceso inicial y asigna su ámbito.' : `Actualiza a @${usuario?.username}.`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="user-username" className={labelClass}>Username {isCreate ? '' : '(no editable)'}</label>
          <input id="user-username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={!isCreate} required maxLength={100} autoCapitalize="none" spellCheck={false} className={inputClass} />
        </div>
        <div className={cn('grid gap-3', showSede ? 'grid-cols-2' : 'grid-cols-1')}>
          <div>
            <label htmlFor="user-role" className={labelClass}>Rol</label>
            <select id="user-role" value={rolId} onChange={(event) => setRolId(event.target.value)} required className={inputClass}>
              <option value="" disabled>Selecciona…</option>
              {currentRoleMissing && usuario && <option value={usuario.rol.id}>{getRoleLabel(usuario.rol.nombre)}</option>}
              {roles.map((rol) => <option key={rol.id} value={rol.id}>{getRoleLabel(rol.nombre)}</option>)}
            </select>
          </div>
          {showSede && (
            <div>
              <label htmlFor="user-sede" className={labelClass}>Sede</label>
              <select id="user-sede" value={sedeId} onChange={(event) => setSedeId(event.target.value)} required={isCreate} className={inputClass}>
                <option value="" disabled>Selecciona…</option>
                {sedes.map((sede) => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
        {isCreate && (
          <div>
            <label htmlFor="user-password" className={labelClass}>Contraseña temporal</label>
            <input id="user-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={72} autoComplete="new-password" required className={inputClass} />
            <p className="mt-1.5 text-[11px] text-muted-foreground">Mínimo 12 caracteres, mayúscula, minúscula y número. El cambio será obligatorio.</p>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-border bg-muted/60 px-4 text-sm text-foreground hover:bg-muted disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'GUARDANDO…' : isCreate ? 'CREAR USUARIO' : 'GUARDAR'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
