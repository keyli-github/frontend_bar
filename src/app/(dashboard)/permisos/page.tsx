'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Boxes, Eye, KeyRound, PencilLine, Search } from 'lucide-react';
import { Bone, BoneKpis, Bones, BoneTable } from '@/components/shared/bones';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SearchBar } from '@/components/shared/search-bar';
import { StatCard } from '@/components/shared/stat-card';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';
import { ApiError, permisosApi } from '@/lib/api';
import { hasPermission } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { Permiso, PermisosAgrupados } from '@/types/api';

const PAGE_SIZE = 25;

const moduleStyles: Record<string, string> = {
  usuarios: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
  roles: 'border-purple-500/20 bg-purple-500/10 text-purple-500',
  permisos: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
  audit: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
  establecimientos: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
};

const actionStyles: Record<string, string> = {
  leer: 'bg-blue-500/10 text-blue-500',
  crear: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  editar: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  eliminar: 'bg-red-500/10 text-red-500',
  'resetear-password': 'bg-purple-500/10 text-purple-500',
};

function moduleLabel(module: string) {
  if (module === 'audit') return 'Auditoría';
  return module.charAt(0).toUpperCase() + module.slice(1);
}

export default function PermisosPage() {
  const permisosJwt = useAuthStore((state) => state.permisos);
  const boneyardBuild = useBoneyardBuild();
  const puedeLeer = boneyardBuild || hasPermission(permisosJwt, 'permisos:leer');

  const [permissions, setPermissions] = useState<Permiso[]>([]);
  const [catalog, setCatalog] = useState<PermisosAgrupados | null>(null);
  const [query, setQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('todos');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    permisosApi
      .listPermisos({
        pagina: page,
        limite: PAGE_SIZE,
        ...(selectedModule !== 'todos' ? { modulo: selectedModule } : {}),
      })
      .then((result) => {
        if (cancelled) return;
        setPermissions(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPaginas || 1);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'No se pudo cargar el catálogo de permisos.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, selectedModule]);

  useEffect(() => {
    let cancelled = false;
    permisosApi
      .listPermisosAgrupados()
      .then((grouped) => {
        if (!cancelled) setCatalog(grouped);
      })
      .catch(() => {
        if (!cancelled) setCatalog({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const modules = useMemo(
    () => (catalog ? Object.keys(catalog).sort((a, b) => a.localeCompare(b)) : []),
    [catalog],
  );
  const allPermissions = useMemo(() => (catalog ? Object.values(catalog).flat() : []), [catalog]);
  const readPermissions = allPermissions.filter((permission) => permission.nombre.endsWith(':leer')).length;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPermissions = permissions.filter(
    (permission) =>
      !normalizedQuery ||
      permission.nombre.toLowerCase().includes(normalizedQuery) ||
      (permission.descripcion ?? '').toLowerCase().includes(normalizedQuery),
  );

  const selectModule = (module: string) => {
    if (module === selectedModule && page === 1) return;
    setLoading(true);
    setSelectedModule(module);
    setPage(1);
  };

  const goToPage = useCallback((nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  }, []);

  if (!puedeLeer) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          No tienes permiso para ver el catálogo de permisos.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
<main className="space-y-4 p-3 sm:p-4 lg:p-6">
        <PageHeader
          title="Permisos"
          subtitle="Catálogo de capacidades disponibles para configurar los roles."
          action={(
            <Link
              href="/roles"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-500 px-3.5 text-xs font-bold text-black transition-colors hover:bg-amber-400"
            >
              Configurar roles <ArrowUpRight size={14} />
            </Link>
          )}
        />

        <Bones
          name="permisos-kpis"
          loading={loading || catalog === null}
          placeholder={<BoneKpis count={4} />}
        >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="PERMISOS"
            value={String(allPermissions.length || total)}
            subtitle="Catálogo activo"
            icon={<KeyRound size={13} />}
            valueColor="text-amber-500"
          />
          <StatCard
            label="MÓDULOS"
            value={String(modules.length)}
            subtitle="Áreas protegidas"
            icon={<Boxes size={13} />}
            valueColor="text-purple-500"
          />
          <StatCard
            label="SOLO LECTURA"
            value={String(readPermissions)}
            subtitle="Permisos leer"
            icon={<Eye size={13} />}
            valueColor="text-blue-500"
          />
          <StatCard
            label="OPERATIVOS"
            value={String(Math.max(0, allPermissions.length - readPermissions))}
            subtitle="Crear, editar o eliminar"
            icon={<PencilLine size={13} />}
            valueColor="text-emerald-500"
          />
        </div>
        </Bones>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Filtrar esta página por permiso o descripción..."
                className="w-full lg:max-w-sm"
              />
              {catalog === null ? (
                <div className="flex gap-1.5 overflow-hidden pb-1 lg:ml-auto lg:pb-0" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Bone key={index} className="h-7 w-20 shrink-0 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="flex gap-1.5 overflow-x-auto pb-1 lg:ml-auto lg:pb-0">
                  <FilterButton
                    active={selectedModule === 'todos'}
                    label="Todos"
                    onClick={() => selectModule('todos')}
                  />
                  {modules.map((module) => (
                    <FilterButton
                      key={module}
                      active={selectedModule === module}
                      label={moduleLabel(module)}
                      onClick={() => selectModule(module)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Catálogo del sistema</h2>
              <p className="text-[10px] text-muted-foreground">
                Los permisos se declaran en el backend y se asignan desde Roles.
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {filteredPermissions.length}
            </span>
          </div>

          <Bones
            name="permisos-tabla"
            loading={loading}
            placeholder={<BoneTable rows={8} cols={4} />}
          >
            {filteredPermissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                <Search size={24} className="mb-3 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Sin permisos coincidentes</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Prueba con otro término o selecciona todos los módulos.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Código', 'Módulo', 'Acción', 'Descripción'].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPermissions.map((permission) => {
                        const action = permission.nombre.split(':')[1] ?? permission.nombre;
                        return (
                          <tr key={permission.id} className="transition-colors hover:bg-muted/25">
                            <td className="px-4 py-3">
                              <code className="text-xs font-bold text-foreground">{permission.nombre}</code>
                            </td>
                            <td className="px-4 py-3"><ModuleBadge module={permission.modulo} /></td>
                            <td className="px-4 py-3"><ActionBadge action={action} /></td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {permission.descripcion ?? 'Sin descripción'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border sm:hidden">
                  {filteredPermissions.map((permission) => {
                    const action = permission.nombre.split(':')[1] ?? permission.nombre;
                    return (
                      <article key={permission.id} className="p-4">
                        <code className="break-all text-xs font-bold text-foreground">{permission.nombre}</code>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          {permission.descripcion ?? 'Sin descripción'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ModuleBadge module={permission.modulo} />
                          <ActionBadge action={action} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </Bones>

          <div className="border-t border-border px-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={goToPage}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-amber-500 text-black'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function ModuleBadge({ module }: { module: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold',
        moduleStyles[module] ?? 'border-border bg-muted text-muted-foreground',
      )}
    >
      {moduleLabel(module)}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-1 text-[9px] font-bold uppercase',
        actionStyles[action] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {action.replaceAll('-', ' ')}
    </span>
  );
}
