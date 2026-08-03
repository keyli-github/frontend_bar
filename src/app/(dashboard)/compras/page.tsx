"use client";

/** Compras: ordenes de compra + proveedores, conectado a ComprasController. */
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { Pagination } from "@/components/shared/pagination";
import { Bones, BoneTable, BoneCards, BoneKpis } from "@/components/shared/bones";
import { EmptyState } from "@/components/shared/empty-state";
import { useBoneyardBuild } from "@/hooks/use-boneyard-build";
import { useAuthStore } from "@/store/auth-store";
import { comprasApi, productosApi, ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/roles";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Compra,
  CompraQuery,
  CompraEstado,
  ComprasResumen,
  Proveedor,
  ProveedorQuery,
  CreateProveedorPayload,
  UpdateProveedorPayload,
  CreateCompraPayload,
  CreateCompraItem,
  Producto,
} from "@/types/api";
import {
  Plus,
  Phone,
  User,
  Mail,
  X,
  Package,
  CheckCircle2,
  Trash2,
  ShoppingBag,
  Truck,
} from "lucide-react";

const PAGE_SIZE = 15;
const PROV_PAGE_SIZE = 12;

const orderFilters: Array<"Todas" | CompraEstado> = [
  "Todas",
  "PENDIENTE",
  "ENVIADA",
  "RECIBIDA",
  "CANCELADA",
];

const estadoBadge: Record<CompraEstado, string> = {
  PENDIENTE: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  ENVIADA: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  RECIBIDA: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  CANCELADA: "bg-zinc-500/10 border-zinc-500/30 text-zinc-400",
};

const fmt = formatCurrency;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/* ─── DETALLE ORDEN (carga items reales) ─── */
function OrderDetailModal({
  order,
  canEdit,
  onClose,
  onChanged,
}: {
  order: Compra;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [full, setFull] = useState<Compra | null>(order.items ? order : null);
  const [loading, setLoading] = useState(!order.items);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // `loading` ya arranca en `!order.items`, y el efecto sale temprano cuando la
  // orden llega completa: no hace falta volver a marcarlo aqui.
  useEffect(() => {
    if (order.items) return;
    let cancelled = false;
    comprasApi
      .getCompra(order.id)
      .then((res) => {
        if (!cancelled) {
          setFull(res);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(errorMessage(err, "No se pudo cargar el detalle."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [order.id, order.items]);

  const data = full ?? order;
  const items = data.items ?? [];

  const changeEstado = async (estado: CompraEstado) => {
    setSaving(true);
    setError(null);
    try {
      await comprasApi.cambiarEstadoCompra(order.id, { estado });
      toast.success(`Orden marcada como ${estado.toLowerCase()}.`);
      onChanged();
      onClose();
    } catch (err) {
      const message = errorMessage(err, "No se pudo cambiar el estado.");
      setError(message);
      toast.error(message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-lg bg-popover border border-border rounded-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground text-base">
              {data.orden}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.proveedor} · {data.fecha}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2.5 py-0.5 rounded border text-[10px] font-bold",
                estadoBadge[data.estado],
              )}
            >
              {data.estado}
            </span>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Estado de la orden
          </p>
          <div className="flex items-center gap-2">
            {(["PENDIENTE", "ENVIADA", "RECIBIDA"] as const).map((s, i) => {
              const steps = ["PENDIENTE", "ENVIADA", "RECIBIDA", "CANCELADA"];
              const currentIdx = steps.indexOf(data.estado);
              const isActive = i <= currentIdx && data.estado !== "CANCELADA";
              const isCurrent = s === data.estado;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-1.5 flex-1">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border",
                        isCurrent
                          ? "bg-amber-500 border-amber-500 text-black"
                          : isActive
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500"
                            : "bg-muted/50 border-border text-muted-foreground",
                      )}
                    >
                      {isActive && !isCurrent ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium hidden sm:block",
                        isCurrent
                          ? "text-amber-500"
                          : isActive
                            ? "text-emerald-500"
                            : "text-muted-foreground",
                      )}
                    >
                      {s}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={cn(
                        "flex-1 h-px mx-1",
                        isActive && i < currentIdx
                          ? "bg-emerald-500/50"
                          : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {data.estado === "CANCELADA" && (
            <p className="text-[11px] text-zinc-400 mt-2">
              Esta orden fue cancelada.
            </p>
          )}
        </div>

        {/* Items reales */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Artículos ({data.articulos})
          </p>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin artículos.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Package size={13} className="text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground truncate">
                        {item.producto}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 font-mono">
                        {item.codigo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <span className="text-muted-foreground text-xs">
                      {item.cantidad} × {fmt(item.costoUnit)}
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {fmt(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.notas && (
            <div className="mt-4 rounded-lg bg-muted/40 border border-border px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Notas
              </p>
              <p className="text-xs text-foreground mt-0.5">{data.notas}</p>
            </div>
          )}
        </div>

        {/* Footer + transiciones */}
        <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-foreground font-mono">
              {fmt(data.total)}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {canEdit && data.estado === "PENDIENTE" && (
              <button
                onClick={() => changeEstado("ENVIADA")}
                disabled={saving}
                className="px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-400 transition-all disabled:opacity-50"
              >
                Marcar enviada
              </button>
            )}
            {canEdit && data.estado === "ENVIADA" && (
              <button
                onClick={() => changeEstado("RECIBIDA")}
                disabled={saving}
                className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-all disabled:opacity-50"
              >
                Marcar recibida
              </button>
            )}
            {canEdit &&
              (data.estado === "PENDIENTE" || data.estado === "ENVIADA") && (
                <button
                  onClick={() => changeEstado("CANCELADA")}
                  disabled={saving}
                  className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground text-xs hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── NUEVA ORDEN (con item builder) ─── */
interface DraftItem {
  productoId: string;
  cantidad: number;
  costoUnit: number;
}

function NewOrderModal({
  proveedores,
  onClose,
  onCreated,
}: {
  proveedores: Proveedor[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [proveedorId, setProveedorId] = useState("");
  const [eta, setEta] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    productosApi
      .listProductos({ limite: 100, activo: "true" })
      .then((res) => {
        if (!cancelled) setProductos(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar los productos.");
      })
      .finally(() => {
        if (!cancelled) setLoadingProds(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addItem = () =>
    setItems((it) => [...it, { productoId: "", cantidad: 1, costoUnit: 0 }]);
  const removeItem = (i: number) =>
    setItems((it) => it.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<DraftItem>) =>
    setItems((it) =>
      it.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );

  const onSelectProducto = (i: number, productoId: string) => {
    const prod = productos.find((p) => p.id === productoId);
    updateItem(i, { productoId, costoUnit: prod ? prod.precioCosto : 0 });
  };

  const total = items.reduce((s, it) => s + it.cantidad * it.costoUnit, 0);
  const validItems = items.filter((it) => it.productoId && it.cantidad > 0);
  const valid = proveedorId !== "" && validItems.length > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const payload: CreateCompraPayload = {
        proveedorId,
        eta: eta || undefined,
        notas: notas.trim() || undefined,
        items: validItems.map<CreateCompraItem>((it) => ({
          productoId: it.productoId,
          cantidad: it.cantidad,
          costoUnit: it.costoUnit,
        })),
      };
      await comprasApi.createCompra(payload);
      toast.success("Orden de compra creada.");
      onCreated();
      onClose();
    } catch (err) {
      const message = errorMessage(err, "No se pudo crear la orden.");
      setError(message);
      toast.error(message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-2xl bg-popover border border-border rounded-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground text-base">
            NUEVA ORDEN DE COMPRA
          </h3>
          <button onClick={onClose} disabled={saving}>
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Proveedor *
              </label>
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm"
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fecha estimada (ETA)
              </label>
              <input
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm"
              />
            </div>
          </div>

          {/* Item builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Artículos *
              </label>
              <button
                onClick={addItem}
                disabled={loadingProds}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                <Plus size={12} /> Agregar
              </button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                {loadingProds
                  ? "Cargando productos…"
                  : "Agrega al menos un artículo a la orden."}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it, i) => {
                  const subtotal = it.cantidad * it.costoUnit;
                  return (
                    <div
                      key={i}
                      className="flex items-end gap-2 rounded-lg bg-muted/30 border border-border p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <label className="text-[9px] text-muted-foreground uppercase tracking-wider">
                          Producto
                        </label>
                        <select
                          value={it.productoId}
                          onChange={(e) => onSelectProducto(i, e.target.value)}
                          className="w-full mt-1 h-9 px-2 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none focus:border-amber-500/50 transition-all"
                        >
                          <option value="">Seleccionar...</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} ({p.codigo})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-16">
                        <label className="text-[9px] text-muted-foreground uppercase tracking-wider">
                          Cant.
                        </label>
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          inputMode="decimal"
                          value={it.cantidad || ""}
                          onChange={(e) =>
                            updateItem(i, { cantidad: Number(e.target.value) })
                          }
                          className="w-full mt-1 h-9 px-2 rounded-lg bg-card border border-border text-foreground text-xs text-center focus:outline-none focus:border-amber-500/50 transition-all"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-[9px] text-muted-foreground uppercase tracking-wider">
                          Costo unit.
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={9999999999.99}
                          step={0.01}
                          inputMode="decimal"
                          value={it.costoUnit || ""}
                          onChange={(e) =>
                            updateItem(i, { costoUnit: Number(e.target.value) })
                          }
                          className="w-full mt-1 h-9 px-2 rounded-lg bg-card border border-border text-foreground text-xs text-right focus:outline-none focus:border-amber-500/50 transition-all"
                        />
                      </div>
                      <div className="w-20 text-right">
                        <label className="text-[9px] text-muted-foreground uppercase tracking-wider block">
                          Subtotal
                        </label>
                        <p className="mt-1 h-9 flex items-center justify-end text-xs font-mono font-semibold text-foreground">
                          {fmt(subtotal)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(i)}
                        className="mb-0.5 p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Notas
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones especiales..."
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all text-sm resize-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-foreground font-mono">
              {fmt(total)}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="h-10 px-4 rounded-xl bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={!valid || saving}
              className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "CREANDO…" : "CREAR ORDEN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CREAR / EDITAR PROVEEDOR ─── */
interface ProveedorForm {
  nombre: string;
  categoria: string;
  contacto: string;
  telefono: string;
  email: string;
  activo: boolean;
}

function ProveedorModal({
  proveedor,
  onClose,
  onSaved,
}: {
  proveedor?: Proveedor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProveedorForm>({
    nombre: proveedor?.nombre ?? "",
    categoria: proveedor?.categoria ?? "",
    contacto: proveedor?.contacto ?? "",
    telefono: proveedor?.telefono ?? "",
    email: proveedor?.email ?? "",
    activo: proveedor?.activo ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProveedorForm>(
    k: K,
    v: ProveedorForm[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const nombre = form.nombre.trim();
    if (nombre.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (proveedor) {
        const payload: UpdateProveedorPayload = {
          nombre,
          categoria: form.categoria.trim(),
          contacto: form.contacto.trim(),
          telefono: form.telefono.trim(),
          email: form.email.trim(),
          activo: form.activo,
        };
        await comprasApi.updateProveedor(proveedor.id, payload);
        toast.success("Proveedor actualizado.");
      } else {
        const payload: CreateProveedorPayload = {
          nombre,
          categoria: form.categoria.trim() || undefined,
          contacto: form.contacto.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          email: form.email.trim() || undefined,
        };
        await comprasApi.createProveedor(payload);
        toast.success("Proveedor creado.");
      }
      onSaved();
      onClose();
    } catch (err) {
      const message = errorMessage(
        err,
        proveedor
          ? "No se pudo actualizar el proveedor."
          : "No se pudo crear el proveedor.",
      );
      setError(message);
      toast.error(message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-popover border border-border rounded-2xl p-6 animate-scale-in">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-foreground text-base">
            {proveedor ? "EDITAR PROVEEDOR" : "NUEVO PROVEEDOR"}
          </h3>
          <button onClick={onClose} disabled={saving}>
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Nombre *
            </label>
            <input
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              minLength={2}
              placeholder="Distribuidora XYZ"
              className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-all"
            />
            {form.nombre.length > 0 && form.nombre.trim().length < 2 && (
              <p className="text-xs text-destructive mt-1">
                El nombre debe tener al menos 2 caracteres.
              </p>
            )}
          </div>
          {proveedor && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Estado
              </label>
              <select
                value={form.activo ? "true" : "false"}
                onChange={(e) => set("activo", e.target.value === "true")}
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-all"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Categoría
            </label>
            <input
              value={form.categoria ?? ""}
              onChange={(e) => set("categoria", e.target.value)}
              placeholder="Licores, cervezas..."
              className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contacto
              </label>
              <input
                value={form.contacto ?? ""}
                onChange={(e) => set("contacto", e.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Teléfono
              </label>
              <input
                value={form.telefono ?? ""}
                onChange={(e) => set("telefono", e.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-10 rounded-lg bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={form.nombre.trim().length < 2 || saving}
              className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all disabled:opacity-40"
            >
              {saving ? "GUARDANDO…" : proveedor ? "GUARDAR" : "CREAR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function ComprasPage() {
  const permisos = useAuthStore((state) => state.permisos);
  const boneyardBuild = useBoneyardBuild();
  const canRead = boneyardBuild || hasPermission(permisos, "compras:leer");
  const canCreate = hasPermission(permisos, "compras:crear");
  const canEdit = hasPermission(permisos, "compras:editar");

  const [activeTab, setActiveTab] = useState<"ordenes" | "proveedores">(
    "ordenes",
  );

  // Ordenes
  const [statusFilter, setStatusFilter] = useState<"Todas" | CompraEstado>(
    "Todas",
  );
  const [ordenes, setOrdenes] = useState<Compra[]>([]);
  const [oPagina, setOPagina] = useState(1);
  const [oTotal, setOTotal] = useState(0);
  const [oPaginas, setOPaginas] = useState(1);
  const [oLoading, setOLoading] = useState(true);
  const [oError, setOError] = useState<string | null>(null);
  const [oReload, setOReload] = useState(0);
  const [resumen, setResumen] = useState<ComprasResumen>({
    totalOrdenes: 0,
    pendientes: 0,
    recibidas: 0,
    montoPendiente: 0,
  });
  const [resumenError, setResumenError] = useState<string | null>(null);
  const [resumenLoading, setResumenLoading] = useState(true);

  // Proveedores
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [pPagina, setPPagina] = useState(1);
  const [pTotal, setPTotal] = useState(0);
  const [pPaginas, setPPaginas] = useState(1);
  const [pLoading, setPLoading] = useState(true);
  const [pError, setPError] = useState<string | null>(null);
  const [pReload, setPReload] = useState(0);
  const [pSearch, setPSearch] = useState("");
  const [pDebouncedSearch, setPDebouncedSearch] = useState("");
  const [pActivo, setPActivo] = useState<"" | "true" | "false">("");

  // Modales
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNewProv, setShowNewProv] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Compra | null>(null);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(
    null,
  );

  // Fetch de KPIs con el mismo filtro de estado que la lista de ordenes.
  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    comprasApi
      .getComprasResumen(
        statusFilter === "Todas" ? {} : { estado: statusFilter },
      )
      .then((data) => {
        if (cancelled) return;
        setResumen(data);
        setResumenError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResumenError(
            errorMessage(err, "No se pudo cargar el resumen de compras."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setResumenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, statusFilter, oReload]);

  // Fetch ordenes
  useEffect(() => {
    if (!canRead || activeTab !== "ordenes") return;
    let cancelled = false;
    const query: CompraQuery = { pagina: oPagina, limite: PAGE_SIZE };
    if (statusFilter !== "Todas") query.estado = statusFilter;
    comprasApi
      .listCompras(query)
      .then((res) => {
        if (cancelled) return;
        setOrdenes(res.data);
        setOTotal(res.total);
        setOPaginas(res.totalPaginas || 1);
        setOError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setOError(errorMessage(err, "No se pudieron cargar las ordenes."));
      })
      .finally(() => {
        if (!cancelled) setOLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, activeTab, oPagina, statusFilter, oReload]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPLoading(true);
      setPDebouncedSearch(pSearch.trim());
      setPPagina(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [pSearch]);

  // Fetch proveedores
  useEffect(() => {
    if (!canRead || activeTab !== "proveedores") return;
    let cancelled = false;
    const query: ProveedorQuery = { pagina: pPagina, limite: PROV_PAGE_SIZE };
    if (pDebouncedSearch) query.q = pDebouncedSearch;
    if (pActivo) query.activo = pActivo;
    comprasApi
      .listProveedores(query)
      .then((res) => {
        if (cancelled) return;
        setProveedores(res.data);
        setPTotal(res.total);
        setPPaginas(res.totalPaginas || 1);
        setPError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setPError(
            errorMessage(err, "No se pudieron cargar los proveedores."),
          );
      })
      .finally(() => {
        if (!cancelled) setPLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, activeTab, pPagina, pReload, pDebouncedSearch, pActivo]);

  // Los spinners se activan en los handlers, no dentro de los efectos, para no
  // encadenar renders. El estado inicial ya arranca en `true`.
  const irAOrdenPagina = useCallback((page: number) => {
    setOLoading(true);
    setOPagina(page);
  }, []);

  const filtrarOrdenes = useCallback((estado: "Todas" | CompraEstado) => {
    if (estado === statusFilter) {
      if (oPagina === 1) return;
      setOLoading(true);
      setOPagina(1);
      return;
    }
    setOLoading(true);
    setResumenLoading(true);
    setStatusFilter(estado);
    setOPagina(1);
  }, [oPagina, statusFilter]);

  const recargarOrdenes = useCallback(() => {
    setOLoading(true);
    setResumenLoading(true);
    setOReload((k) => k + 1);
  }, []);

  const irAProveedorPagina = useCallback((page: number) => {
    setPLoading(true);
    setPPagina(page);
  }, []);

  const filtrarProveedoresActivos = useCallback(
    (value: "" | "true" | "false") => {
      setPLoading(true);
      setPActivo(value);
      setPPagina(1);
    },
    [],
  );

  const recargarProveedores = useCallback(() => {
    setPLoading(true);
    setPReload((k) => k + 1);
  }, []);

  /** Proveedores para el select de "nueva orden" (carga on-demand al abrir). */
  const [orderProvs, setOrderProvs] = useState<Proveedor[]>([]);
  const openNewOrder = useCallback(async () => {
    setShowNewOrder(true);
    try {
      const res = await comprasApi.listProveedores({
        limite: 100,
        activo: "true",
      });
      setOrderProvs(res.data);
    } catch {
      setOrderProvs([]);
      toast.error("No se pudieron cargar los proveedores activos.");
    }
  }, []);

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes permiso para ver las compras.
      </div>
    );
  }

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Compras
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ordenes de compra y proveedores
            </p>
          </div>
          {canCreate &&
            (activeTab === "ordenes" ? (
              <button
                onClick={openNewOrder}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98] w-fit"
              >
                <Plus size={16} /> NUEVA ORDEN
              </button>
            ) : (
              <button
                onClick={() => setShowNewProv(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98] w-fit"
              >
                <Plus size={16} /> NUEVO PROVEEDOR
              </button>
            ))}
        </div>

        {/* KPIs */}
        <Bones name="compras-kpis" loading={resumenLoading} placeholder={<BoneKpis count={4} />}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            {
              label: "TOTAL ORDENES",
              value: String(resumen.totalOrdenes),
              color: "text-foreground",
            },
            {
              label: "PENDIENTES",
              value: String(resumen.pendientes),
              color: "text-amber-500",
            },
            {
              label: "RECIBIDAS",
              value: String(resumen.recibidas),
              color: "text-emerald-400",
            },
            {
              label: "MONTO PENDIENTE",
              value: fmt(resumen.montoPendiente),
              color: "text-amber-500",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3"
            >
              <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
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
        {resumenError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
          >
            {resumenError}
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-6 border-b border-border animate-fade-in-up">
          {[
            { id: "ordenes", label: "Ordenes de Compra" },
            { id: "proveedores", label: "Proveedores" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "ordenes" | "proveedores")}
              className={cn(
                "pb-3 text-sm font-medium border-b-2 -mb-px transition-all",
                activeTab === tab.id
                  ? "border-amber-500 text-amber-500"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ORDENES TAB ── */}
        {activeTab === "ordenes" && (
          <>
            {oError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
              >
                {oError}
              </p>
            )}

            <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-in-up">
              {orderFilters.map((f) => (
                <button
                  key={f}
                  onClick={() => filtrarOrdenes(f)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    statusFilter === f
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {f === "Todas" ? "Todas" : f}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
              <Bones
                name="compras-ordenes"
                loading={oLoading}
                placeholder={<BoneTable rows={PAGE_SIZE} cols={9} />}
              >
                {ordenes.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBag size={22} />}
                    title="Sin ordenes"
                    description="No hay ordenes con los filtros aplicados."
                  />
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {[
                            "Orden",
                            "Fecha",
                            "Proveedor",
                            "Articulos",
                            "Total",
                            "Estado",
                            "ETA",
                            "Solicitado por",
                            "",
                          ].map((h) => (
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
                        {ordenes.map((order) => (
                          <tr
                            key={order.id}
                            className="hover:bg-muted/40 transition-colors"
                          >
                            <td className="px-4 py-3 text-amber-500 font-mono text-xs font-medium">
                              {order.orden}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {order.fecha}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {order.proveedor}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {order.articulos} items
                            </td>
                            <td className="px-4 py-3 text-foreground font-semibold font-mono">
                              {fmt(order.total)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded border text-[10px] font-bold",
                                  estadoBadge[order.estado],
                                )}
                              >
                                {order.estado}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {order.eta || "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {order.solicitadoPor}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-foreground text-xs hover:bg-muted transition-colors"
                              >
                                Ver detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Bones>
              <div className="border-t border-border px-4">
                <Pagination
                  page={oPagina}
                  totalPages={oPaginas}
                  total={oTotal}
                  pageSize={PAGE_SIZE}
                  onPageChange={irAOrdenPagina}
                />
              </div>
            </div>
          </>
        )}

        {/* ── PROVEEDORES TAB ── */}
        {activeTab === "proveedores" && (
          <>
            {pError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
              >
                {pError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up">
              <input
                type="search"
                value={pSearch}
                onChange={(e) => setPSearch(e.target.value)}
                placeholder="Buscar por nombre o contacto..."
                aria-label="Buscar proveedores"
                className="h-10 flex-1 px-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-amber-500/50 transition-all"
              />
              <select
                value={pActivo}
                onChange={(e) =>
                  filtrarProveedoresActivos(
                    e.target.value as "" | "true" | "false",
                  )
                }
                aria-label="Filtrar proveedores por estado"
                className="h-10 px-3 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-all sm:w-48"
              >
                <option value="">Todos los estados</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>

            <Bones
              name="compras-proveedores"
              loading={pLoading}
              placeholder={<BoneCards count={6} />}
            >
              {proveedores.length === 0 ? (
                <EmptyState
                  icon={<Truck size={22} />}
                  title="Sin proveedores"
                  description="No hay proveedores con los filtros aplicados."
                />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                  {proveedores.map((prov) => (
                    <div
                      key={prov.id}
                      className="rounded-xl border border-border bg-card p-5 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-amber-500 text-lg">🧳</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {prov.nombre}
                          </h3>
                          {prov.categoria && (
                            <p className="text-xs text-amber-500">
                              {prov.categoria}
                            </p>
                          )}
                          {!prov.activo && (
                            <span className="text-[10px] text-zinc-500">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-4">
                        {prov.contacto && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User size={12} />
                            {prov.contacto}
                          </div>
                        )}
                        {prov.telefono && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone size={12} />
                            {prov.telefono}
                          </div>
                        )}
                        {prov.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                            <Mail size={12} />
                            {prov.email}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/60 p-3 text-center">
                          <p className="text-xs text-muted-foreground">
                            Ordenes
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {prov.ordenes}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/60 p-3 text-center">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-bold text-amber-500 font-mono">
                            {fmt(prov.total)}
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => setEditingProveedor(prov)}
                          className="w-full mt-3 px-3 py-2 rounded-lg bg-muted/60 border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Bones>
            <Pagination
              page={pPagina}
              totalPages={pPaginas}
              total={pTotal}
              pageSize={PROV_PAGE_SIZE}
              onPageChange={irAProveedorPagina}
            />
          </>
        )}
      </div>

      {/* ── MODALES ── */}
      {showNewOrder && (
        <NewOrderModal
          proveedores={orderProvs}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => {
            setOPagina(1);
            recargarOrdenes();
          }}
        />
      )}
      {showNewProv && (
        <ProveedorModal
          onClose={() => setShowNewProv(false)}
          onSaved={() => {
            setPPagina(1);
            recargarProveedores();
          }}
        />
      )}
      {editingProveedor && (
        <ProveedorModal
          proveedor={editingProveedor}
          onClose={() => setEditingProveedor(null)}
          onSaved={recargarProveedores}
        />
      )}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          canEdit={canEdit}
          onClose={() => setSelectedOrder(null)}
          onChanged={recargarOrdenes}
        />
      )}
    </div>
  );
}
