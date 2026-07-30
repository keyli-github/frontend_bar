'use client';

/**
 * Catalogo code-first de permisos existentes.
 *
 * La UI es deliberadamente de solo lectura: escribir `modulo:accion` en una
 * tabla no crea funcionalidad. Un permiso nuevo nace en
 * `permissions.constants.ts`, protege un endpoint con `@Permissions(...)`, se
 * sincroniza por seed y finalmente se asigna desde la pagina Roles.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pagination } from '@/components/shared/pagination';
import { useAuthStore } from '@/store/auth-store';
import { permisosApi, ApiError } from '@/lib/api';
import { hasPermission } from '@/lib/roles';
import type { Permiso } from '@/types/api';
import { KeySquare, Search, ShieldCheck } from 'lucide-react';
import { Bones, BoneCatalogo } from '@/components/shared/bones';
import { useBoneyardBuild } from '@/hooks/use-boneyard-build';

const PAGE_SIZE = 25;

export default function PermisosPage() {
  const permisosJwt = useAuthStore((s) => s.permisos);
  const boneyardBuild = useBoneyardBuild();
  const puedeLeer = boneyardBuild || hasPermission(permisosJwt, 'permisos:leer');

  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let cancelled = false;
    permisosApi
      .listPermisos({ pagina, limite: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setPermisos(result.data);
        setTotal(result.total);
        setTotalPaginas(result.totalPaginas || 1);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'No se pudo cargar el catálogo de permisos.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pagina]);

  const modulos = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    const visibles = query
      ? permisos.filter(
          (permiso) =>
            permiso.nombre.toLowerCase().includes(query) ||
            (permiso.descripcion ?? '').toLowerCase().includes(query),
        )
      : permisos;

    return Object.entries(
      visibles.reduce<Record<string, Permiso[]>>((grouped, permiso) => {
        (grouped[permiso.modulo] ??= []).push(permiso);
        return grouped;
      }, {}),
    ).sort(([a], [b]) => a.localeCompare(b));
  }, [busqueda, permisos]);

  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
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
    <div className="space-y-5 p-3 sm:p-4 lg:p-6">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Permisos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} capacidades implementadas en el backend
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-info/25 bg-info/10 px-4 py-3 text-sm text-info">
        <ShieldCheck size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Catálogo de solo lectura. Asigna capacidades desde <strong>Roles</strong>.
          Los permisos nuevos se incorporan al implementar su endpoint.
        </p>
      </div>

      <div className="relative max-w-xs animate-fade-in-up">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Filtrar esta página…"
          aria-label="Filtrar permisos de esta página"
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
        />
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
        name="permisos-catalogo"
        loading={loading}
        placeholder={<BoneCatalogo groups={3} items={4} />}
      >
        {modulos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin resultados.</p>
      ) : (
        <div className="space-y-5 stagger-children">
          {modulos.map(([modulo, items]) => (
            <section key={modulo} className="surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <KeySquare size={15} className="text-primary-text" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
                  {modulo}
                </h2>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((permiso) => (
                  <article
                    key={permiso.id}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <p className="truncate font-mono text-xs text-foreground">
                      {permiso.nombre}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {permiso.descripcion ?? 'Sin descripción'}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {permiso._count.roles} rol
                      {permiso._count.roles === 1 ? '' : 'es'} asignado
                      {permiso._count.roles === 1 ? '' : 's'}
                    </p>
                  </article>
                ))}
              </div>
            </section>
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
    </div>
  );
}
