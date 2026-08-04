"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FolderTree,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Bones, BoneTable } from "@/components/shared/bones";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { ModalShell } from "@/components/shared/modal-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchBar } from "@/components/shared/search-bar";
import { useBoneyardBuild } from "@/hooks/use-boneyard-build";
import { ApiError, categoriasApi } from "@/lib/api";
import { hasPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { Categoria } from "@/types/api";

const PAGE_SIZE = 25;
const FIELD_CLASS =
  "w-full rounded-lg border border-border bg-muted/40 px-3 text-sm text-foreground outline-none focus:border-amber-500/60";

type ModalState = { mode: "create" } | { mode: "edit"; categoria: Categoria };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export default function CategoriasPage() {
  const permisos = useAuthStore((state) => state.permisos);
  const boneyardBuild = useBoneyardBuild();
  const canRead = boneyardBuild || hasPermission(permisos, "categorias:leer");
  const canCreate = hasPermission(permisos, "categorias:crear");
  const canEdit = hasPermission(permisos, "categorias:editar");
  const canDelete = hasPermission(permisos, "categorias:eliminar");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Categoria | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;

    categoriasApi
      .listCategorias({
        pagina: page,
        limite: PAGE_SIZE,
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        ...(status !== "all" ? { activo: status } : {}),
      })
      .then((response) => {
        if (cancelled) return;
        setCategorias(response.data);
        setTotal(response.total);
        setTotalPages(response.totalPaginas || 1);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(errorMessage(reason, "No se pudieron cargar las categorías."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canRead, debouncedSearch, page, reloadToken, status]);

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  const openCreate = () => {
    setNombre("");
    setDescripcion("");
    setActivo(true);
    setFormError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (categoria: Categoria) => {
    setNombre(categoria.nombre);
    setDescripcion(categoria.descripcion ?? "");
    setActivo(categoria.activo);
    setFormError(null);
    setModal({ mode: "edit", categoria });
  };

  const save = async () => {
    if (!modal || saving) return;
    if (!nombre.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        activo,
      };
      if (modal.mode === "create") {
        await categoriasApi.createCategoria(payload);
        toast.success("Categoría creada");
      } else {
        await categoriasApi.updateCategoria(modal.categoria.id, payload);
        toast.success("Categoría actualizada");
      }
      setModal(null);
      reload();
    } catch (reason) {
      setFormError(errorMessage(reason, "No se pudo guardar la categoría."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (categoria: Categoria) => {
    try {
      await categoriasApi.updateCategoria(categoria.id, {
        activo: !categoria.activo,
      });
      toast.success(categoria.activo ? "Categoría desactivada" : "Categoría activada");
      reload();
    } catch (reason) {
      toast.error(errorMessage(reason, "No se pudo cambiar el estado."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    try {
      await categoriasApi.deleteCategoria(deleteTarget.id);
      toast.success("Categoría desactivada; sus productos se conservaron");
      setDeleteTarget(null);
      reload();
    } catch (reason) {
      toast.error(errorMessage(reason, "No se pudo desactivar la categoría."));
    } finally {
      setSaving(false);
    }
  };

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes permiso para ver las categorías.
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-5 bg-background p-3 sm:p-4 lg:p-6">
      <PageHeader
        title="Categorías"
        subtitle="Catálogo global utilizado por productos e inventario."
        action={
          canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-black hover:bg-amber-400"
            >
              <Plus size={16} /> NUEVA CATEGORÍA
            </button>
          ) : undefined
        }
      />

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar categoría..."
          className="w-full sm:max-w-sm"
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground sm:ml-auto"
          aria-label="Filtrar categorías por estado"
        >
          <option value="all">Todas</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
      </section>

      {error && (
        <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Bones
        name="categorias-listado"
        loading={loading}
        onRetry={reload}
        placeholder={<BoneTable rows={8} cols={5} />}
      >
        {categorias.length === 0 ? (
          <EmptyState
            icon={<FolderTree size={24} />}
            title="Sin categorías"
            description="Crea una categoría o cambia los filtros."
          />
        ) : (
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/35">
                    {[
                      "Categoría",
                      "Descripción",
                      "Productos",
                      "Estado",
                      "Acciones",
                    ].map((heading) => (
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
                  {categorias.map((categoria) => (
                    <tr key={categoria.id} className="hover:bg-muted/25">
                      <td className="px-4 py-4 font-semibold text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <FolderTree size={16} className="text-amber-500" />
                          {categoria.nombre}
                        </span>
                      </td>
                      <td className="max-w-sm px-4 py-4 text-xs text-muted-foreground">
                        {categoria.descripcion || "Sin descripción"}
                      </td>
                      <td className="px-4 py-4 font-mono text-foreground">
                        {categoria.productosCount}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-1 text-[10px] font-bold uppercase",
                            categoria.activo
                              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
                              : "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {categoria.activo ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(categoria)}
                                className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                                aria-label={`Editar ${categoria.nombre}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void toggleStatus(categoria)}
                                className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                                aria-label={`${categoria.activo ? "Desactivar" : "Activar"} ${categoria.nombre}`}
                              >
                                {categoria.activo ? <PowerOff size={14} /> : <Power size={14} />}
                              </button>
                            </>
                          )}
                          {canDelete && categoria.activo && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(categoria)}
                              className="grid size-8 place-items-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              aria-label={`Desactivar ${categoria.nombre}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </Bones>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={(nextPage) => {
          setPage(nextPage);
        }}
      />

      <ModalShell
        open={modal !== null}
        title={modal?.mode === "edit" ? "Editar categoría" : "Nueva categoría"}
        subtitle="El nombre debe ser único en todo el catálogo."
        onClose={() => !saving && setModal(null)}
      >
        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nombre
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              maxLength={80}
              className={cn(FIELD_CLASS, "mt-1.5 h-10")}
              autoFocus
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Descripción
            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              maxLength={300}
              className={cn(FIELD_CLASS, "mt-1.5 min-h-24 py-2")}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
              className="size-4 accent-amber-500"
            />
            Categoría activa
          </label>
          {formError && (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {formError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="h-11 w-full rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "GUARDANDO…" : "GUARDAR CATEGORÍA"}
          </button>
        </div>
      </ModalShell>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Desactivar categoría"
        description={
          <>
            <strong>{deleteTarget?.nombre}</strong> dejará de estar disponible para nuevos productos. Los productos existentes conservarán su categoría.
          </>
        }
        confirmLabel="Desactivar"
        variant="warning"
        loading={saving}
        onClose={() => !saving && setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
