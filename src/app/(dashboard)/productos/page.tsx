"use client";

/** Catalogo global de productos, conectado a ProductosController. */
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

import { Pagination } from "@/components/shared/pagination";
import { Bone, Bones, BoneKpis } from "@/components/shared/bones";
import { SkeletonProductGrid } from "@/components/shared/skeleton-loader";
import { useBoneyardBuild } from "@/hooks/use-boneyard-build";
import { useAuthStore } from "@/store/auth-store";
import { categoriasApi, productosApi, ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/roles";
import { formatCurrency } from "@/lib/format";
import type {
  Categoria,
  Producto,
  ProductoQuery,
  CreateProductoPayload,
  UpdateProductoPayload,
} from "@/types/api";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  X,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Package,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── helpers ─── */
const fmt = formatCurrency;
const PAGE_SIZE = 20;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/** Datos del formulario del modal (mapea al payload del backend). */
interface ProductoForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoriaId: string;
  precioVenta: number;
  precioCosto: number;
  disponiblePos: boolean;
  activo: boolean;
}

const emptyForm = (categoriaId = ""): ProductoForm => ({
  codigo: "",
  nombre: "",
  descripcion: "",
  categoriaId,
  precioVenta: 0,
  precioCosto: 0,
  disponiblePos: true,
  activo: true,
});

/* ─── sub-components ─── */
function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
        active
          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
          : "bg-zinc-500/10 border-zinc-500/25 text-zinc-500",
      )}
    >
      {active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

/* ─── CARD VIEW ─── */
function ProductCard({
  product,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  onTogglePOS,
}: {
  product: Producto;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onTogglePOS: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md dark:hover:shadow-white/5 group",
        !product.activo && "opacity-60",
      )}
    >
      {/* Image */}
      <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden">
        <Image
          src="/assets/trago.webp"
          alt={product.nombre}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/50 text-white backdrop-blur-sm">
          {product.categoria}
        </span>
        {product.disponiblePos && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-amber-500/80 text-black text-[10px] font-bold">
            POS
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div>
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            {product.nombre}
          </h3>
          <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
            {product.codigo}
          </p>
          {product.descripcion && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {product.descripcion}
            </p>
          )}
        </div>

        {/* Prices */}
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="rounded-lg bg-muted/50 p-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              Venta
            </p>
            <p className="text-xs font-bold text-amber-500">
              {fmt(product.precioVenta)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              Costo
            </p>
            <p className="text-xs font-semibold text-foreground">
              {fmt(product.precioCosto)}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-500/8 p-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              Margen
            </p>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {product.margin}%
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <Badge active={product.activo} />
        </div>

        {/* Actions */}
        {(canEdit || canDelete) && (
          <div className="flex gap-1.5 pt-1 border-t border-border">
            {canEdit && (
              <>
                <button
                  onClick={onEdit}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted text-foreground transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={onToggleStatus}
                  className="py-1.5 px-2 rounded-lg text-xs bg-muted/60 hover:bg-muted text-muted-foreground transition-colors"
                  title={product.activo ? "Desactivar" : "Activar"}
                >
                  {product.activo ? (
                    <ToggleRight size={15} className="text-emerald-500" />
                  ) : (
                    <ToggleLeft size={15} />
                  )}
                </button>
                <button
                  onClick={onTogglePOS}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs transition-colors",
                    product.disponiblePos
                      ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted",
                  )}
                  title="Toggle disponible en POS"
                >
                  <ShoppingCart size={13} />
                </button>
              </>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="py-1.5 px-2 rounded-lg text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── PRODUCT FORM MODAL ─── */
function ProductModal({
  open,
  product,
  categorias,
  saving,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  product?: Producto;
  categorias: Categoria[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: ProductoForm) => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState<ProductoForm>(() =>
    product
      ? {
          codigo: product.codigo,
          nombre: product.nombre,
          descripcion: product.descripcion ?? "",
          categoriaId: product.categoriaId,
          precioVenta: product.precioVenta,
          precioCosto: product.precioCosto,
          disponiblePos: product.disponiblePos,
          activo: product.activo,
        }
      : emptyForm(categorias[0]?.id),
  );

  if (!open) return null;

  const margin =
    form.precioVenta > 0
      ? Math.round(
          ((form.precioVenta - form.precioCosto) / form.precioVenta) * 100,
        )
      : 0;

  const set = <K extends keyof ProductoForm>(k: K, v: ProductoForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid =
    form.codigo.trim() !== "" &&
    form.nombre.trim() !== "" &&
    form.categoriaId !== "" &&
    form.precioVenta > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-lg bg-popover border border-border rounded-2xl shadow-2xl animate-scale-in overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-popover z-10">
          <h2 className="font-bold text-foreground text-base">
            {isEdit ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Codigo + Nombre */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Código *
              </label>
              <input
                value={form.codigo}
                onChange={(e) => set("codigo", e.target.value)}
                disabled={isEdit}
                placeholder="Ej: PRD-001"
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nombre *
              </label>
              <input
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="Ej: Mojito Clásico"
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/10 transition-all"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Descripción
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              placeholder="Descripción breve del producto..."
              rows={2}
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm resize-none focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/10 transition-all"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Categoría *
            </label>
            <select
              value={form.categoriaId}
              onChange={(e) => set("categoriaId", e.target.value)}
              className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 transition-all"
            >
              {!categorias.some((item) => item.id === form.categoriaId) &&
                product && (
                  <option value={product.categoriaId}>{product.categoria}</option>
                )}
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Precio de venta *
              </label>
              <input
                type="number"
                min={0}
                max={9999999999.99}
                step={0.01}
                inputMode="decimal"
                value={form.precioVenta || ""}
                onChange={(e) => set("precioVenta", Number(e.target.value))}
                placeholder="0"
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Precio de costo *
              </label>
              <input
                type="number"
                min={0}
                max={9999999999.99}
                step={0.01}
                inputMode="decimal"
                value={form.precioCosto || ""}
                onChange={(e) => set("precioCosto", Number(e.target.value))}
                placeholder="0"
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 transition-all"
              />
            </div>
          </div>

          {/* Margen calculado */}
          <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Margen de ganancia calculado
            </span>
            <span
              className={cn(
                "text-base font-bold",
                margin >= 40
                  ? "text-emerald-600 dark:text-emerald-400"
                  : margin >= 20
                    ? "text-amber-500"
                    : "text-red-500",
              )}
            >
              {margin}%
            </span>
          </div>

          {/* Toggles */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => set("disponiblePos", !form.disponiblePos)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all",
                form.disponiblePos
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-muted/50 border-border text-muted-foreground",
              )}
            >
              <ShoppingCart size={15} />
              {form.disponiblePos ? "Disponible en POS" : "No en POS"}
            </button>
            <button
              type="button"
              onClick={() => set("activo", !form.activo)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all",
                form.activo
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted/50 border-border text-muted-foreground",
              )}
            >
              {form.activo ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {form.activo ? "Activo" : "Inactivo"}
            </button>
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-muted/60 border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (valid) onSave(form);
            }}
            disabled={!valid || saving}
            className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {saving
              ? "GUARDANDO…"
              : isEdit
                ? "GUARDAR CAMBIOS"
                : "CREAR PRODUCTO"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DELETE CONFIRM ─── */
function DeleteModal({
  product,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  product: Producto;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-6 animate-scale-in text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="font-bold text-foreground text-base mb-1">
          Eliminar producto
        </h3>
        <p className="text-sm text-muted-foreground mb-1">
          ¿Eliminar{" "}
          <span className="font-semibold text-foreground">
            &ldquo;{product.nombre}&rdquo;
          </span>
          ?
        </p>
        <p className="text-xs text-muted-foreground mb-5">
          Se marcará como inactivo (baja lógica).
        </p>
        {error && (
          <p role="alert" className="text-xs text-destructive mb-4">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-all disabled:opacity-50"
          >
            {saving ? "…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function ProductosPage() {
  const permisos = useAuthStore((state) => state.permisos);
  const boneyardBuild = useBoneyardBuild();
  const canRead = boneyardBuild || hasPermission(permisos, "productos:leer");
  const canCreate = hasPermission(permisos, "productos:crear");
  const canEdit = hasPermission(permisos, "productos:editar");
  const canDelete = hasPermission(permisos, "productos:eliminar");
  const canReadCategories = hasPermission(permisos, "categorias:leer");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("Todos");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Modales
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Producto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!canReadCategories) return;
    let cancelled = false;
    categoriasApi
      .listCategorias({ activo: "true", pagina: 1, limite: 100 })
      .then((response) => {
        if (!cancelled) setCategorias(response.data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(errorMessage(reason, "No se pudieron cargar las categorías."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canReadCategories]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;

    const query: ProductoQuery = { pagina, limite: PAGE_SIZE };
    if (debouncedSearch) query.q = debouncedSearch;
    if (catFilter !== "Todos") query.categoriaId = catFilter;
    if (statusFilter !== "all")
      query.activo = statusFilter === "active" ? "true" : "false";

    productosApi
      .listProductos(query)
      .then((res) => {
        if (cancelled) return;
        setProductos(res.data);
        setTotal(res.total);
        setTotalPaginas(res.totalPaginas || 1);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(errorMessage(err, "No se pudieron cargar los productos."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canRead, pagina, debouncedSearch, catFilter, statusFilter, reloadKey]);

  /** El spinner se activa aqui, no en el efecto, para no encadenar renders. */
  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

  const reload = () => setReloadKey((k) => k + 1);

  const handleCreate = async (data: ProductoForm) => {
    setModalSaving(true);
    setModalError(null);
    try {
      const payload: CreateProductoPayload = {
        codigo: data.codigo.trim(),
        nombre: data.nombre.trim(),
        descripcion: data.descripcion.trim() || undefined,
        categoriaId: data.categoriaId,
        precioVenta: data.precioVenta,
        precioCosto: data.precioCosto,
        disponiblePos: data.disponiblePos,
        activo: data.activo,
      };
      await productosApi.createProducto(payload);
      setCreateOpen(false);
      reload();
    } catch (err) {
      setModalError(errorMessage(err, "No se pudo crear el producto."));
    } finally {
      setModalSaving(false);
    }
  };

  const handleEdit = async (data: ProductoForm) => {
    if (!editProduct) return;
    setModalSaving(true);
    setModalError(null);
    try {
      const payload: UpdateProductoPayload = {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion.trim() || undefined,
        categoriaId: data.categoriaId,
        precioVenta: data.precioVenta,
        precioCosto: data.precioCosto,
        disponiblePos: data.disponiblePos,
        activo: data.activo,
      };
      await productosApi.updateProducto(editProduct.id, payload);
      setEditProduct(null);
      reload();
    } catch (err) {
      setModalError(errorMessage(err, "No se pudieron guardar los cambios."));
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalSaving(true);
    setModalError(null);
    try {
      await productosApi.deleteProducto(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setModalError(errorMessage(err, "No se pudo eliminar el producto."));
    } finally {
      setModalSaving(false);
    }
  };

  /** Toggle rápido de activo/POS vía updateProducto (optimista con recarga). */
  const quickUpdate = async (p: Producto, patch: UpdateProductoPayload) => {
    setProductos((list) =>
      list.map((it) => (it.id === p.id ? { ...it, ...patch } : it)),
    );
    try {
      await productosApi.updateProducto(p.id, patch);
    } catch {
      reload(); // revertir con datos reales del servidor
    }
  };

  const openCreate = () => {
    setModalError(null);
    setCreateOpen(true);
  };
  const openEdit = (p: Producto) => {
    setModalError(null);
    setEditProduct(p);
  };
  const openDelete = (p: Producto) => {
    setModalError(null);
    setDeleteTarget(p);
  };

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes permiso para ver los productos.
      </div>
    );
  }

  const categoryTabs = [
    { id: "Todos", nombre: "Todos" },
    ...categorias.map(({ id, nombre }) => ({ id, nombre })),
  ];

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              Catálogo de Productos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? <Bone className="h-3.5 w-24" /> : <>{total} productos</>}
              {!canCreate && !canEdit && (
                <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                  Solo lectura
                </span>
              )}
            </p>
          </div>
          {canCreate && categorias.length > 0 && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-amber-500/15 w-fit"
            >
              <Plus size={16} /> NUEVO PRODUCTO
            </button>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {/* KPIs */}
        <Bones
          name="productos-kpis"
          loading={loading}
          placeholder={<BoneKpis count={4} />}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
            {[
              {
                label: "TOTAL",
                value: String(total),
                color: "text-foreground",
                icon: <Package size={16} />,
              },
              {
                label: "ACTIVOS (PÁGINA)",
                value: String(productos.filter((p) => p.activo).length),
                color: "text-emerald-600 dark:text-emerald-400",
                icon: <CheckCircle2 size={16} />,
              },
              {
                label: "EN POS (PÁGINA)",
                value: String(productos.filter((p) => p.disponiblePos).length),
                color: "text-amber-500",
                icon: <ShoppingCart size={16} />,
              },
              {
                label: "MARGEN PROM. (PÁGINA)",
                value:
                  (productos.length
                    ? Math.round(
                        productos.reduce((s, p) => s + p.margin, 0) /
                          productos.length,
                      )
                    : 0) + "%",
                color: "text-blue-500",
                icon: <TrendingUp size={16} />,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                  {k.icon}
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">
                    {k.label}
                  </p>
                  <p
                    className={cn(
                      "text-xl font-bold font-mono mt-0.5",
                      k.color,
                    )}
                  >
                    {k.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Bones>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up">
          <div className="relative max-w-xs flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-wrap">
            {categoryTabs.map((categoria) => (
              <button
                key={categoria.id}
                onClick={() => {
                  setCatFilter(categoria.id);
                  setPagina(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  catFilter === categoria.id
                    ? "bg-amber-500 text-black"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "inactive");
              setPagina(1);
            }}
            className="h-9 px-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-all"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>

          {/* View toggle */}
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "p-2 rounded-lg border transition-all",
                view === "grid"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-2 rounded-lg border transition-all",
                view === "list"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <Bones
          name="productos-contenido"
          loading={loading}
          placeholder={<SkeletonProductGrid count={PAGE_SIZE} />}
        >
          {productos.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          ) : view === "grid" ? (
            /* ── GRID VIEW ── */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 stagger-children">
              {productos.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => openEdit(p)}
                  onDelete={() => openDelete(p)}
                  onToggleStatus={() => quickUpdate(p, { activo: !p.activo })}
                  onTogglePOS={() =>
                    quickUpdate(p, { disponiblePos: !p.disponiblePos })
                  }
                />
              ))}
            </div>
          ) : (
            /* ── LIST VIEW ── */
            <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        "Producto",
                        "Categoría",
                        "Precio venta",
                        "Costo",
                        "Margen",
                        "POS",
                        "Estado",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {productos.map((p) => (
                      <tr
                        key={p.id}
                        className={cn(
                          "hover:bg-muted/30 transition-colors",
                          !p.activo && "opacity-50",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src="/assets/trago.webp"
                                alt={p.nombre}
                                fill
                                className="object-cover"
                                sizes="36px"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {p.nombre}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70 font-mono">
                                {p.codigo}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                            {p.categoria}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-500 font-mono">
                          {fmt(p.precioVenta)}
                        </td>
                        <td className="px-4 py-3 text-foreground font-mono">
                          {fmt(p.precioCosto)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "font-bold",
                              p.margin >= 40
                                ? "text-emerald-600 dark:text-emerald-400"
                                : p.margin >= 20
                                  ? "text-amber-500"
                                  : "text-red-500",
                            )}
                          >
                            {p.margin}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                              p.disponiblePos
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {p.disponiblePos ? "✓ POS" : "No POS"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge active={p.activo} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => openEdit(p)}
                                  className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground transition-colors"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() =>
                                    quickUpdate(p, { activo: !p.activo })
                                  }
                                  className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground transition-colors"
                                >
                                  {p.activo ? (
                                    <ToggleRight
                                      size={15}
                                      className="text-emerald-500"
                                    />
                                  ) : (
                                    <ToggleLeft size={15} />
                                  )}
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => openDelete(p)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      {/* ── MODALS ── */}
      {createOpen && (
        <ProductModal
          open
          categorias={categorias}
          saving={modalSaving}
          error={modalError}
          onClose={() => setCreateOpen(false)}
          onSave={handleCreate}
        />
      )}
      {editProduct && (
        <ProductModal
          key={editProduct.id}
          open
          product={editProduct}
          categorias={categorias}
          saving={modalSaving}
          error={modalError}
          onClose={() => setEditProduct(null)}
          onSave={handleEdit}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          saving={modalSaving}
          error={modalError}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
