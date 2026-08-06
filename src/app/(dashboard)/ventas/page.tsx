"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  ListOrdered,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Bones } from "@/components/shared/bones";
import { Pagination } from "@/components/shared/pagination";
import { ApiError, ventasApi, etiquetasApi, productosApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { hasPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { Producto } from "@/types/api";
import type {
  AnularVentaPayload,
  ConciliarVentaPayload,
  CreateVentaPayload,
  EstadoConciliacion,
  Etiqueta,
  Venta,
  VentaItemInput,
} from "@/types/ventas";

// ── Helpers ──────────────────────────────────────────────────────────────────

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

type CartItem = { producto: Producto; cantidad: number };

const ESTADO_BADGE: Record<
  EstadoConciliacion,
  { label: string; cls: string; icon: React.ElementType }
> = {
  PENDIENTE: { label: "Pendiente", cls: "bg-amber-500/10 text-amber-500 border-amber-500/25", icon: Clock },
  EFECTIVO: { label: "Efectivo", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25", icon: BadgeCheck },
  BILLETERA: { label: "Billetera", cls: "bg-blue-500/10 text-blue-500 border-blue-500/25", icon: Wallet },
};

// ── Componentes internos ──────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: EstadoConciliacion }) {
  const cfg = ESTADO_BADGE[estado];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", cfg.cls)}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function VentasPage() {
  const permisos = useAuthStore((s) => s.permisos);

  const canCreate = hasPermission(permisos, "ventas:crear");
  const canReadAll = hasPermission(permisos, "ventas:leer");
  const canReadOwn = hasPermission(permisos, "ventas:leer-propias");
  const canConciliar = hasPermission(permisos, "ventas:conciliar");
  const canConciliarCorregir = hasPermission(permisos, "ventas:conciliar-corregir");
  const canAnular = hasPermission(permisos, "ventas:anular");

  type Tab = "crear" | "historial";
  const defaultTab: Tab = canCreate ? "crear" : "historial";
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <div className="min-h-full bg-background">
      {/* Header con tabs */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Ventas</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Registro de ventas y clasificación de pagos
              </p>
            </div>
            {(canCreate || canReadAll || canReadOwn) && (
              <div
                className="inline-flex h-9 rounded-lg border border-border bg-muted/35 p-0.5"
                role="tablist"
              >
                {canCreate && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "crear"}
                    onClick={() => setActiveTab("crear")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                      activeTab === "crear"
                        ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ShoppingCart size={13} /> Nueva venta
                  </button>
                )}
                {(canReadAll || canReadOwn) && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "historial"}
                    onClick={() => setActiveTab("historial")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                      activeTab === "historial"
                        ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ListOrdered size={13} /> Historial
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] p-4 sm:p-5">
        {!canCreate && !canReadAll && !canReadOwn && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
            <AlertTriangle size={18} className="text-amber-500" />
            <p className="text-sm text-muted-foreground">
              No tienes permisos para acceder al módulo de ventas.
            </p>
          </div>
        )}

        {activeTab === "crear" && canCreate && (
          <NuevaVentaPanel key="crear" />
        )}

        {activeTab === "historial" && (canReadAll || canReadOwn) && (
          <HistorialPanel
            canReadAll={canReadAll}
            canConciliar={canConciliar}
            canConciliarCorregir={canConciliarCorregir}
            canAnular={canAnular}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: NUEVA VENTA (VENDEDORA)
// ─────────────────────────────────────────────────────────────────────────────

function NuevaVentaPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoadingProductos(true);
      productosApi
      .listProductos({ pagina: 1, limite: 100, activo: "true" })
      .then((res) => {
        if (!cancelled) {
          setProductos(res.data.filter((p) => p.disponiblePos));
          setErrorProductos(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setErrorProductos(errorMessage(err, "No se pudieron cargar los productos."));
      })
      .finally(() => {
        if (!cancelled) setLoadingProductos(false);
      });
    });
    return () => { cancelled = true; };
  }, []);

  const filteredProductos = productos.filter((p) =>
    !searchQuery ||
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const addToCart = (producto: Producto) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.producto.id === producto.id);
      if (existing) return prev.map((i) => i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const changeQuantity = (productoId: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((i) => i.producto.id === productoId ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i);
      return updated.filter((i) => i.cantidad > 0);
    });
  };

  const removeFromCart = (productoId: string) => {
    setCart((prev) => prev.filter((i) => i.producto.id !== productoId));
  };

  const total = cart.reduce((sum, i) => sum + i.producto.precioVenta * i.cantidad, 0);

  const submitVenta = async () => {
    if (cart.length === 0) { setSubmitError("Agrega al menos un producto."); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateVentaPayload = {
        idempotencyKey: idempotencyKeyRef.current,
        items: cart.map((i): VentaItemInput => ({ productoId: i.producto.id, cantidad: i.cantidad })),
      };
      await ventasApi.crearVenta(payload);
      toast.success("Venta registrada correctamente");
      // Reset para nueva venta: nuevo idempotencyKey + limpiar carrito
      idempotencyKeyRef.current = crypto.randomUUID();
      setCart([]);
    } catch (err: unknown) {
      // Si falla por red, el mismo idempotencyKey permite reintentar
      setSubmitError(errorMessage(err, "No se pudo registrar la venta."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    // Retener el mismo idempotencyKey para el reintento
    void submitVenta();
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Catálogo de productos */}
      <div className="flex-1 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto por nombre o código…"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-amber-500/60"
          />
        </div>

        {errorProductos && (
          <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorProductos}
          </p>
        )}

        {loadingProductos ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-muted/30" />
            ))}
          </div>
        ) : filteredProductos.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {searchQuery ? `Sin resultados para "${searchQuery}"` : "No hay productos disponibles para venta."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProductos.map((prod) => {
              const inCart = cart.find((i) => i.producto.id === prod.id);
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => addToCart(prod)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:border-amber-500/40 hover:bg-amber-500/[0.04]",
                    inCart ? "border-amber-500/40 bg-amber-500/[0.04]" : "border-border bg-card",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="truncate text-[11px] font-mono text-muted-foreground">{prod.codigo}</span>
                    {inCart && (
                      <span className="ml-1 shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-black">
                        {inCart.cantidad}
                      </span>
                    )}
                  </div>
                  <span className="line-clamp-2 text-xs font-semibold text-foreground">{prod.nombre}</span>
                  <span className="mt-auto text-sm font-bold text-amber-500">{formatCurrency(prod.precioVenta)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrito */}
      <aside className="w-full rounded-xl border border-border bg-card lg:w-[320px]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShoppingCart size={15} /> Venta actual
          </h2>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Limpiar
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="grid place-items-center py-12 text-center">
            <ShoppingCart size={28} className="text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">Selecciona productos del catálogo</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {cart.map((item) => (
              <li key={item.producto.id} className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-semibold text-foreground">{item.producto.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatCurrency(item.producto.precioVenta)} × {item.cantidad} = {formatCurrency(item.producto.precioVenta * item.cantidad)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.producto.id, -1)}
                    className="grid size-6 place-items-center rounded border border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-6 text-center text-xs font-mono font-bold text-foreground">{item.cantidad}</span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.producto.id, 1)}
                    className="grid size-6 place-items-center rounded border border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500"
                  >
                    <Plus size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.producto.id)}
                    className="ml-1 text-muted-foreground/50 hover:text-destructive"
                  >
                    <X size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">TOTAL</span>
            <span className="font-mono text-lg font-bold text-foreground">{formatCurrency(total)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            El método de pago se registra en caja después de confirmar la venta.
          </p>
          {submitError && (
            <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <p>{submitError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-1 font-semibold underline"
              >
                Reintentar con los mismos datos
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => void submitVenta()}
            disabled={submitting || cart.length === 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 size={15} className="animate-spin" /> Registrando…</>
            ) : (
              <><Check size={15} /> CONFIRMAR VENTA</>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: HISTORIAL (CAJERO / ADMIN / VENDEDORA propias)
// ─────────────────────────────────────────────────────────────────────────────

interface HistorialPanelProps {
  canReadAll: boolean;
  canConciliar: boolean;
  canConciliarCorregir: boolean;
  canAnular: boolean;
}

function HistorialPanel({
  canReadAll,
  canConciliar,
  canConciliarCorregir,
  canAnular,
}: HistorialPanelProps) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<"" | "ACTIVA" | "ANULADA">("");
  const requestIdRef = useRef(0);

  const loadVentas = useCallback(async (p = 1) => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const fn = canReadAll ? ventasApi.listVentas : ventasApi.listMisVentas;
      const res = await fn({
        pagina: p,
        limite: 20,
        estado: filterEstado || undefined,
      });
      if (reqId !== requestIdRef.current) return;
      setVentas(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPaginas);
      setPage(p);
      setError(null);
    } catch (err: unknown) {
      if (reqId !== requestIdRef.current) return;
      setError(errorMessage(err, "No se pudieron cargar las ventas."));
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [canReadAll, filterEstado]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadVentas(1);
    });
    return () => { cancelled = true; };
  }, [loadVentas]);

  // Estado para conciliación modal
  const [conciliandoVentaId, setConciliandoVentaId] = useState<string | null>(null);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [concEstado, setConcEstado] = useState<"EFECTIVO" | "BILLETERA">("EFECTIVO");
  const [concEtiquetaId, setConcEtiquetaId] = useState("");
  const [concComprobante, setConcComprobante] = useState("");
  const [concCodigoOp, setConcCodigoOp] = useState("");
  const [concSaving, setConcSaving] = useState(false);
  const [concError, setConcError] = useState<string | null>(null);

  // Estado para anulación modal
  const [anulandoVentaId, setAnulandoVentaId] = useState<string | null>(null);
  const [anulMotivo, setAnulMotivo] = useState("");
  const [anulSaving, setAnulSaving] = useState(false);
  const [anulError, setAnulError] = useState<string | null>(null);

  const openConciliar = async (venta: Venta) => {
    setConciliandoVentaId(venta.id);
    setConcEstado("EFECTIVO");
    setConcEtiquetaId("");
    setConcComprobante("");
    setConcCodigoOp("");
    setConcError(null);
    // Cargar etiquetas si aún no están cargadas
    if (etiquetas.length === 0) {
      try {
        const list = await etiquetasApi.listEtiquetasActivas();
        setEtiquetas(list);
        if (list.length > 0) setConcEtiquetaId(list[0].id);
      } catch { /* ignore */ }
    } else if (etiquetas.length > 0) {
      setConcEtiquetaId(etiquetas[0].id);
    }
  };

  const submitConciliar = async () => {
    if (!conciliandoVentaId) return;
    if (concEstado === "BILLETERA" && !concEtiquetaId) {
      setConcError("Selecciona la billetera digital usada.");
      return;
    }
    setConcSaving(true);
    setConcError(null);
    try {
      const payload: ConciliarVentaPayload = {
        estado: concEstado,
        etiquetaId: concEstado === "BILLETERA" ? concEtiquetaId : undefined,
        comprobante: concComprobante.trim() || undefined,
        codigoOperacion: concCodigoOp.trim() || undefined,
      };
      await ventasApi.conciliarVenta(conciliandoVentaId, payload);
      toast.success(concEstado === "EFECTIVO" ? "Marcada como efectivo" : "Pago de billetera registrado");
      setConciliandoVentaId(null);
      await loadVentas(page);
    } catch (err: unknown) {
      setConcError(errorMessage(err, "No se pudo clasificar el pago."));
    } finally {
      setConcSaving(false);
    }
  };

  const submitAnular = async () => {
    if (!anulandoVentaId || !anulMotivo.trim()) {
      setAnulError("El motivo de anulación es obligatorio.");
      return;
    }
    setAnulSaving(true);
    setAnulError(null);
    try {
      const payload: AnularVentaPayload = { motivo: anulMotivo.trim() };
      await ventasApi.anularVenta(anulandoVentaId, payload);
      toast.success("Venta anulada");
      setAnulandoVentaId(null);
      setAnulMotivo("");
      await loadVentas(page);
    } catch (err: unknown) {
      setAnulError(errorMessage(err, "No se pudo anular la venta."));
    } finally {
      setAnulSaving(false);
    }
  };

  const ventaConciliando = ventas.find((v) => v.id === conciliandoVentaId);
  const etiquetaSeleccionada = etiquetas.find((e) => e.id === concEtiquetaId);

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as "" | "ACTIVA" | "ANULADA")}
          className="h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-amber-500/60"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVA">Activas</option>
          <option value="ANULADA">Anuladas</option>
        </select>
        <button
          type="button"
          onClick={() => void loadVentas(1)}
          disabled={loading}
          className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:border-amber-500/40 hover:text-amber-500 disabled:opacity-50"
          aria-label="Actualizar"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
        <span className="text-xs text-muted-foreground">{total} venta{total !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Bones
        name="ventas-historial"
        loading={loading}
        onRetry={() => void loadVentas(page)}
        placeholder={
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted/30" />
            ))}
          </div>
        }
      >
        {ventas.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No hay ventas registradas.
          </div>
        ) : (
          <div className="space-y-2">
            {ventas.map((venta) => (
              <VentaCard
                key={venta.id}
                venta={venta}
                canConciliar={canConciliar}
                canConciliarCorregir={canConciliarCorregir}
                canAnular={canAnular}
                onConciliar={() => void openConciliar(venta)}
                onAnular={() => { setAnulandoVentaId(venta.id); setAnulMotivo(""); setAnulError(null); }}
              />
            ))}
          </div>
        )}
      </Bones>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={20}
        onPageChange={(p) => void loadVentas(p)}
      />

      {/* Modal: Conciliar */}
      {conciliandoVentaId && ventaConciliando && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-foreground">Clasificar pago</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Venta {ventaConciliando.codigo} · {formatCurrency(ventaConciliando.total)}
                </p>
              </div>
              <button type="button" onClick={() => setConciliandoVentaId(null)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {/* Selector de método */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(["EFECTIVO", "BILLETERA"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setConcEstado(m)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all",
                    concEstado === m
                      ? "border-amber-500 bg-amber-500/10 text-amber-500"
                      : "border-border text-muted-foreground hover:border-border/80 hover:bg-muted/30",
                  )}
                >
                  {m === "EFECTIVO" ? <CreditCard size={15} /> : <Wallet size={15} />}
                  {m === "EFECTIVO" ? "Efectivo" : "Billetera"}
                </button>
              ))}
            </div>

            {concEstado === "BILLETERA" && (
              <div className="space-y-3 mb-4">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Billetera *
                  <select
                    value={concEtiquetaId}
                    onChange={(e) => setConcEtiquetaId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground outline-none focus:border-amber-500/60"
                  >
                    <option value="">— Selecciona billetera —</option>
                    {etiquetas.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </label>
                {etiquetaSeleccionada?.requiereComprobante && (
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Comprobante / voucher
                    <input
                      value={concComprobante}
                      onChange={(e) => setConcComprobante(e.target.value)}
                      placeholder="URL o referencia del comprobante"
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground outline-none focus:border-amber-500/60"
                    />
                  </label>
                )}
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Código de operación (opcional)
                  <input
                    value={concCodigoOp}
                    onChange={(e) => setConcCodigoOp(e.target.value)}
                    placeholder="Ej: 1234567890"
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground outline-none focus:border-amber-500/60"
                  />
                </label>
              </div>
            )}

            {concError && (
              <p className="mb-3 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {concError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConciliandoVentaId(null)}
                className="flex-1 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitConciliar()}
                disabled={concSaving}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-amber-500 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
              >
                {concSaving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Anular */}
      {anulandoVentaId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-foreground">Anular venta</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Esta acción revierte el stock y los movimientos de caja.
                </p>
              </div>
              <button type="button" onClick={() => setAnulandoVentaId(null)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Motivo de anulación *
              <textarea
                value={anulMotivo}
                onChange={(e) => setAnulMotivo(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-xs text-foreground outline-none focus:border-amber-500/60 resize-none"
                placeholder="Describe el motivo de la anulación…"
              />
            </label>
            {anulError && (
              <p className="mt-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {anulError}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setAnulandoVentaId(null)}
                className="flex-1 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitAnular()}
                disabled={anulSaving}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-destructive text-sm font-bold text-white hover:bg-destructive/90 disabled:opacity-50"
              >
                {anulSaving ? <><Loader2 size={14} className="animate-spin" /> Anulando…</> : "Anular venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de venta individual ───────────────────────────────────────────────

interface VentaCardProps {
  venta: Venta;
  canConciliar: boolean;
  canConciliarCorregir: boolean;
  canAnular: boolean;
  onConciliar: () => void;
  onAnular: () => void;
}

function VentaCard({ venta, canConciliar, canConciliarCorregir, canAnular, onConciliar, onAnular }: VentaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const concState = venta.conciliacion?.estado ?? null;
  const isAnulada = venta.estado === "ANULADA";
  const canChangeConciliation = concState !== null && concState !== "PENDIENTE";

  return (
    <div className={cn("rounded-xl border bg-card transition-colors", isAnulada ? "border-border/50 opacity-70" : "border-border")}>
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-foreground">{venta.codigo}</span>
            {isAnulada ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                <XCircle size={10} /> Anulada
              </span>
            ) : concState && <EstadoBadge estado={concState} />}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {venta.vendedora && <span>{venta.vendedora.username}</span>}
            <span>{new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(venta.createdAt))}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-foreground">{formatCurrency(venta.total)}</span>
          {/* Botones de acción */}
          {!isAnulada && (
            <div className="flex gap-1">
              {canConciliar && concState === "PENDIENTE" && (
                <button
                  type="button"
                  onClick={onConciliar}
                  className="flex h-8 items-center gap-1 rounded-lg border border-amber-500/30 px-2.5 text-[11px] font-semibold text-amber-500 hover:bg-amber-500/10"
                >
                  <Wallet size={12} /> Clasificar
                </button>
              )}
              {canConciliarCorregir && canChangeConciliation && (
                <button
                  type="button"
                  onClick={onConciliar}
                  className="flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                >
                  <Wallet size={12} /> Corregir
                </button>
              )}
              {canAnular && (
                <button
                  type="button"
                  onClick={onAnular}
                  className="flex h-8 items-center gap-1 rounded-lg border border-red-500/25 px-2 text-[11px] font-semibold text-red-500 hover:bg-red-500/10"
                  aria-label="Anular venta"
                >
                  <XCircle size={12} />
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
            aria-label={expanded ? "Contraer" : "Expandir"}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Items de la venta (expandible) */}
      {expanded && venta.items.length > 0 && (
        <div className="border-t border-border px-3 pb-3">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/50">
                {["Producto", "Cant.", "P.Unit", "Subtotal"].map((h) => (
                  <th key={h} className="py-1.5 text-left font-semibold text-muted-foreground first:pl-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {venta.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1 text-foreground">{item.producto?.nombre ?? item.productoId}</td>
                  <td className="py-1 text-muted-foreground">{item.cantidad}</td>
                  <td className="py-1 text-muted-foreground">{formatCurrency(item.precioUnitario)}</td>
                  <td className="py-1 font-semibold text-foreground">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {venta.conciliacion?.etiqueta && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Billetera: <span className="font-semibold text-blue-500">{venta.conciliacion.etiqueta.nombre}</span>
              {venta.conciliacion.codigoOperacion && <> · Ref: {venta.conciliacion.codigoOperacion}</>}
            </p>
          )}
          {isAnulada && venta.motivoAnulacion && (
            <p className="mt-2 text-[11px] text-red-500">Anulación: {venta.motivoAnulacion}</p>
          )}
        </div>
      )}
    </div>
  );
}
