"use client";

/** Inventario (stock por sede), conectado a InventarioController. */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Bones, BoneKpis, BoneTable } from "@/components/shared/bones";
import { useBoneyardBuild } from "@/hooks/use-boneyard-build";
import { useAuthStore } from "@/store/auth-store";
import {
  categoriasApi,
  establecimientosApi,
  inventarioApi,
  productosApi,
  ApiError,
} from "@/lib/api";
import { hasPermission } from "@/lib/roles";
import { formatCurrency } from "@/lib/format";
import type {
  Categoria,
  Establecimiento,
  InventarioItem,
  InventarioQuery,
  InventarioResumen,
  Producto,
} from "@/types/api";
import {
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Package,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

function StockBar({
  stock,
  min,
  max,
}: {
  stock: number;
  min: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min((stock / max) * 100, 100) : 0;
  const color =
    stock <= min / 2
      ? "bg-red-500"
      : stock <= min
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function InventarioPage() {
  const router = useRouter();
  const permisos = useAuthStore((state) => state.permisos);
  const user = useAuthStore((state) => state.user);
  const boneyardBuild = useBoneyardBuild();
  const canRead = boneyardBuild || hasPermission(permisos, "inventario:leer");
  const canEdit = hasPermission(permisos, "inventario:editar");
  const canCreateProduct = hasPermission(permisos, "productos:crear");
  const canConfigure = hasPermission(permisos, "inventario:crear");
  const canReadProducts = hasPermission(permisos, "productos:leer");
  const canReadEstablishments = hasPermission(
    permisos,
    "establecimientos:leer",
  );
  const canReadCategories = hasPermission(permisos, "categorias:leer");
  const isSuperadmin = user?.rol === "SUPERADMIN";
  const canCreateConfig =
    canConfigure &&
    canReadProducts &&
    (!isSuperadmin || canReadEstablishments);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCat, setSelectedCat] = useState("Todos");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [items, setItems] = useState<InventarioItem[]>([]);
  const [resumen, setResumen] = useState<InventarioResumen | null>(null);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Modal de ajuste
  const [adjustItem, setAdjustItem] = useState<InventarioItem | null>(null);
  const [adjustType, setAdjustType] = useState<
    "ENTRADA" | "SALIDA" | "AJUSTE"
  >("ENTRADA");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReference, setAdjustReference] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Modal de configuración
  const [configItem, setConfigItem] = useState<InventarioItem | null | undefined>(
    undefined,
  );
  const [products, setProducts] = useState<Producto[]>([]);
  const [establishments, setEstablishments] = useState<Establecimiento[]>([]);
  const [configProductId, setConfigProductId] = useState("");
  const [configSedeId, setConfigSedeId] = useState("");
  const [configMin, setConfigMin] = useState("0");
  const [configMax, setConfigMax] = useState("0");
  const [configLocation, setConfigLocation] = useState("");
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (!canReadCategories) return;
    let cancelled = false;

    categoriasApi
      .listCategorias({ activo: "true", limite: 100 })
      .then((response) => {
        if (!cancelled) setCategorias(response.data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(errorMessage(err, "No se pudieron cargar las categorías."));
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

    const query: InventarioQuery = { pagina, limite: PAGE_SIZE };
    if (debouncedSearch) query.q = debouncedSearch;
    if (selectedCat !== "Todos") query.categoriaId = selectedCat;

    Promise.all([
      inventarioApi.listInventario(query),
      inventarioApi.getInventarioResumen(),
    ])
      .then(([lista, kpis]) => {
        if (cancelled) return;
        setItems(lista.data);
        setTotal(lista.total);
        setTotalPaginas(lista.totalPaginas || 1);
        setResumen(kpis);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(errorMessage(err, "No se pudo cargar el inventario."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canRead, pagina, debouncedSearch, selectedCat, reloadKey]);

  useEffect(() => {
    if (configItem === undefined) return;
    if (configItem) return;
    if (!canCreateConfig) return;
    let cancelled = false;

    const loadProducts = async () => {
      const first = await productosApi.listProductos({
        pagina: 1,
        limite: 100,
        activo: "true",
      });
      if (first.totalPaginas <= 1) return first.data;
      const rest = await Promise.all(
        Array.from({ length: first.totalPaginas - 1 }, (_, index) =>
          productosApi.listProductos({
            pagina: index + 2,
            limite: 100,
            activo: "true",
          }),
        ),
      );
      return [...first.data, ...rest.flatMap((page) => page.data)];
    };

    const loadEstablishments = async () => {
      if (!isSuperadmin) return [];
      const first = await establecimientosApi.listEstablecimientos({
        pagina: 1,
        limite: 100,
      });
      if (first.totalPaginas <= 1) return first.data;
      const rest = await Promise.all(
        Array.from({ length: first.totalPaginas - 1 }, (_, index) =>
          establecimientosApi.listEstablecimientos({
            pagina: index + 2,
            limite: 100,
          }),
        ),
      );
      return [...first.data, ...rest.flatMap((page) => page.data)];
    };

    Promise.all([loadProducts(), loadEstablishments()])
      .then(([productRows, establishmentRows]) => {
        if (cancelled) return;
        setProducts(productRows);
        setEstablishments(establishmentRows.filter((sede) => sede.activo));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = errorMessage(
          err,
          "No se pudieron cargar los datos para configurar el inventario.",
        );
        setConfigError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canCreateConfig, configItem, isSuperadmin]);

  /** El spinner se activa aqui, no en el efecto, para no encadenar renders. */
  const irAPagina = useCallback((page: number) => {
    setLoading(true);
    setPagina(page);
  }, []);

  const openAdjust = (item: InventarioItem) => {
    setAdjustItem(item);
    setAdjustQty("");
    setAdjustReference("");
    setAdjustType("ENTRADA");
    setAdjustError(null);
  };

  const openConfig = (item: InventarioItem | null = null) => {
    if (!canConfigure || (!item && !canCreateConfig)) return;
    setProducts([]);
    setEstablishments([]);
    setConfigProductId(item?.productoId ?? "");
    setConfigSedeId(item?.sedeId ?? "");
    setConfigMin(String(item?.min ?? 0));
    setConfigMax(String(item?.max ?? 0));
    setConfigLocation(item?.ubicacion ?? "");
    setConfigError(null);
    setConfigLoading(!item);
    setConfigItem(item);
  };

  const closeConfig = () => {
    if (!configSaving) setConfigItem(undefined);
  };

  const saveConfig = async () => {
    if (!configProductId) {
      setConfigError("Selecciona un producto.");
      return;
    }
    if (isSuperadmin && !configSedeId) {
      setConfigError("Selecciona una sede.");
      return;
    }

    const stockMin = Number(configMin);
    const stockMax = Number(configMax);
    if (
      configMin.trim() === "" ||
      !Number.isFinite(stockMin) ||
      stockMin < 0
    ) {
      setConfigError("El stock mínimo debe ser un número mayor o igual a 0.");
      return;
    }
    if (
      configMax.trim() === "" ||
      !Number.isFinite(stockMax) ||
      stockMax < 0
    ) {
      setConfigError("El stock máximo debe ser un número mayor o igual a 0.");
      return;
    }

    setConfigSaving(true);
    setConfigError(null);
    try {
      await inventarioApi.upsertInventario({
        productoId: configProductId,
        sedeId: isSuperadmin ? configSedeId : undefined,
        stockMin,
        stockMax,
        ubicacion: configLocation.trim(),
      });
      toast.success(
        configItem
          ? "Configuración de inventario actualizada."
          : "Producto configurado en el inventario.",
      );
      setConfigItem(undefined);
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (err) {
      const message = errorMessage(
        err,
        "No se pudo guardar la configuración del inventario.",
      );
      setConfigError(message);
      toast.error(message);
    } finally {
      setConfigSaving(false);
    }
  };

  const confirmAdjust = async () => {
    if (!adjustItem) return;
    const cantidad = Number(adjustQty);
    const invalidQuantity =
      adjustQty.trim() === "" ||
      !Number.isFinite(cantidad) ||
      (adjustType === "AJUSTE" ? cantidad < 0 : cantidad <= 0);
    if (invalidQuantity) {
      setAdjustError(
        adjustType === "AJUSTE"
          ? "El conteo físico debe ser mayor o igual a 0."
          : "La cantidad debe ser mayor a 0.",
      );
      return;
    }
    setAdjustSaving(true);
    setAdjustError(null);
    try {
      await inventarioApi.ajustarStock(adjustItem.id, {
        tipo: adjustType,
        cantidad,
        referencia: adjustReference.trim() || undefined,
      });
      toast.success("Stock actualizado.");
      setAdjustItem(null);
      setLoading(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const message = errorMessage(err, "No se pudo registrar el ajuste.");
      setAdjustError(message);
      toast.error(message);
    } finally {
      setAdjustSaving(false);
    }
  };

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes permiso para ver el inventario.
      </div>
    );
  }

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        <PageHeader
          title="Inventario"
          subtitle={loading ? " " : `${total} productos con stock configurado`}
          action={
            canCreateConfig || (canCreateProduct && canReadProducts) ? (
              <div className="flex flex-wrap gap-2">
                {canCreateConfig && (
                  <button
                    onClick={() => openConfig()}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold tracking-wide text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
                  >
                    <Settings2 size={15} /> CONFIGURAR INVENTARIO
                  </button>
                )}
                {canCreateProduct && canReadProducts && (
                  <button
                    onClick={() => router.push("/productos")}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold tracking-wide text-foreground transition-all hover:bg-muted active:scale-[0.98]"
                  >
                    <Plus size={15} /> NUEVO PRODUCTO
                  </button>
                )}
              </div>
            ) : undefined
          }
        />

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
          name="inventario-kpis"
          loading={loading}
          placeholder={<BoneKpis count={4} />}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
            {[
              {
                label: "TOTAL PRODUCTOS",
                value: String(resumen?.totalItems ?? 0),
                color: "text-foreground",
              },
              {
                label: "ESTADO CRÍTICO",
                value: String(resumen?.critico ?? 0),
                color: "text-red-500",
              },
              {
                label: "EN ALERTA",
                value: String(resumen?.alerta ?? 0),
                color: "text-amber-500",
              },
              {
                label: "VALOR INVENTARIO",
                value: formatCurrency(resumen?.valorTotal ?? 0),
                color: "text-emerald-500",
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3"
              >
                <p className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">
                  {k.label}
                </p>
                <p
                  className={cn(
                    "text-base lg:text-lg font-bold font-mono mt-1",
                    k.color,
                  )}
                >
                  {k.value}
                </p>
              </div>
            ))}
          </div>
        </Bones>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre o código..."
            className="max-w-xs"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-wrap">
            {[
              { id: "Todos", nombre: "Todos" },
              ...categorias.map((categoria) => ({
                id: categoria.id,
                nombre: categoria.nombre,
              })),
            ].map((categoria) => (
              <button
                key={categoria.id}
                onClick={() => {
                  setSelectedCat(categoria.id);
                  setPagina(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  selectedCat === categoria.id
                    ? "bg-amber-500 text-black"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Bones
            name="inventario-tabla"
            loading={loading}
            placeholder={<BoneTable rows={PAGE_SIZE} cols={9} />}
          >
            {items.length === 0 ? (
              <EmptyState
                icon={<Package size={22} />}
                title="Sin productos"
                description="Prueba con otros filtros."
              />
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        "Código",
                        "Producto",
                        "Categoría",
                        "Stock",
                        "Min/Max",
                        "Estado",
                        "Costo",
                        "Ubicación",
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
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {item.codigo}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src="/assets/trago.webp"
                                alt={item.producto}
                                fill
                                className="object-cover"
                                sizes="28px"
                              />
                            </div>
                            <span className="text-foreground font-medium">
                              {item.producto}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {item.categoria}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-bold",
                                item.estado === "OK"
                                  ? "text-emerald-500"
                                  : item.estado === "ALERTA"
                                    ? "text-amber-500"
                                    : "text-red-500",
                              )}
                            >
                              {item.stock}
                            </span>
                            <StockBar
                              stock={item.stock}
                              min={item.min}
                              max={item.max}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {item.min}/{item.max}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.estado} />
                        </td>
                        <td className="px-4 py-3 text-foreground font-mono">
                          {formatCurrency(item.costo)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {item.ubicacion}
                        </td>
                        <td className="px-4 py-3">
                          {canEdit || canConfigure ? (
                            <div className="flex items-center gap-2">
                              {canConfigure && (
                                <button
                                  onClick={() => openConfig(item)}
                                  className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                  Configurar
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => openAdjust(item)}
                                  className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
                                >
                                  Ajustar
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Bones>

          {/* Paginación */}
          <div className="border-t border-border px-4">
            <Pagination
              page={pagina}
              totalPages={totalPaginas}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={irAPagina}
            />
          </div>
        </div>
      </div>

      {/* Configuración Modal */}
      {configItem !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeConfig}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-popover animate-scale-in">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {configItem
                    ? "CONFIGURAR INVENTARIO"
                    : "AGREGAR AL INVENTARIO"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  El stock inicial de una nueva configuración será 0.
                </p>
              </div>
              <button
                onClick={closeConfig}
                disabled={configSaving}
                aria-label="Cerrar configuración"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Producto *
                </label>
                <select
                  value={configProductId}
                  onChange={(event) => setConfigProductId(event.target.value)}
                  disabled={configLoading || configSaving || Boolean(configItem)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-all focus:border-amber-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {configLoading
                      ? "Cargando productos..."
                      : "Seleccionar producto..."}
                  </option>
                  {configItem &&
                    !products.some(
                      (product) => product.id === configItem.productoId,
                    ) && (
                      <option value={configItem.productoId}>
                        {configItem.producto} ({configItem.codigo})
                      </option>
                    )}
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.nombre} ({product.codigo})
                    </option>
                  ))}
                </select>
              </div>

              {isSuperadmin && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sede *
                  </label>
                  <select
                    value={configSedeId}
                    onChange={(event) => setConfigSedeId(event.target.value)}
                    disabled={configLoading || configSaving || Boolean(configItem)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-all focus:border-amber-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {configLoading ? "Cargando sedes..." : "Seleccionar sede..."}
                    </option>
                    {configItem &&
                      !establishments.some(
                        (sede) => sede.id === configItem.sedeId,
                      ) && (
                        <option value={configItem.sedeId}>Sede actual</option>
                      )}
                    {establishments.map((sede) => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Stock mínimo *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={configMin}
                    onChange={(event) => setConfigMin(event.target.value)}
                    disabled={configSaving}
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-all focus:border-amber-500/50 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Stock máximo *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={configMax}
                    onChange={(event) => setConfigMax(event.target.value)}
                    disabled={configSaving}
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-all focus:border-amber-500/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={configLocation}
                  onChange={(event) => setConfigLocation(event.target.value)}
                  disabled={configSaving}
                  placeholder="Ej. Almacén A, estante 3"
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-amber-500/50 disabled:opacity-60"
                />
              </div>

              {configError && (
                <p role="alert" className="text-xs text-destructive">
                  {configError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
              <button
                onClick={closeConfig}
                disabled={configSaving}
                className="h-10 rounded-xl border border-border bg-muted/60 px-4 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveConfig}
                disabled={configLoading || configSaving}
                className="h-10 rounded-xl bg-amber-500 px-4 text-sm font-bold tracking-wide text-black transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {configSaving ? "GUARDANDO…" : "GUARDAR CONFIGURACIÓN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ajuste Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !adjustSaving && setAdjustItem(null)}
          />
          <div className="relative w-full max-w-sm bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-base">
                AJUSTE DE STOCK
              </h3>
              <button
                onClick={() => setAdjustItem(null)}
                disabled={adjustSaving}
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 mb-5 border border-border">
              <p className="text-foreground font-medium">
                {adjustItem.producto}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {adjustItem.codigo} · Stock actual:{" "}
                <span className="text-amber-500 font-bold">
                  {adjustItem.stock}
                </span>
              </p>
            </div>
            <div className="flex gap-2 mb-5">
              {(["ENTRADA", "SALIDA", "AJUSTE"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setAdjustType(type);
                    setAdjustError(null);
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all",
                    adjustType === type
                      ? type === "ENTRADA"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
                        : type === "SALIDA"
                          ? "bg-red-500/15 border-red-500/40 text-red-500"
                          : "bg-amber-500/15 border-amber-500/40 text-amber-500"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {type === "ENTRADA" ? (
                    <ArrowUp size={15} />
                  ) : type === "SALIDA" ? (
                    <ArrowDown size={15} />
                  ) : (
                    <Settings2 size={15} />
                  )}
                  {type === "ENTRADA"
                    ? "+ Entrada"
                    : type === "SALIDA"
                      ? "- Salida"
                      : "Conteo"}
                </button>
              ))}
            </div>
            <div className="mb-5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {adjustType === "AJUSTE" ? "Conteo físico" : "Cantidad"}
              </label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="0"
                min={adjustType === "AJUSTE" ? 0 : 0.01}
                step="any"
                className="w-full mt-2 h-12 px-4 rounded-xl bg-muted/50 border border-border text-foreground text-lg text-center focus:outline-none focus:border-amber-500/60 transition-all"
              />
              {adjustType === "AJUSTE" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Reemplaza el stock actual por el conteo físico ingresado.
                </p>
              )}
            </div>
            <div className="mb-5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Referencia (opcional)
              </label>
              <input
                type="text"
                value={adjustReference}
                onChange={(event) => setAdjustReference(event.target.value)}
                placeholder="Motivo o documento"
                className="mt-2 h-10 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-amber-500/60"
              />
            </div>
            {adjustError && (
              <p role="alert" className="mb-4 text-xs text-destructive">
                {adjustError}
              </p>
            )}
            <button
              onClick={confirmAdjust}
              disabled={adjustSaving}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adjustSaving ? "GUARDANDO…" : "CONFIRMAR AJUSTE"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
