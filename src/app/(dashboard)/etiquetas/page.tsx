"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Bones, Bone } from "@/components/shared/bones";
import { ApiError, etiquetasApi } from "@/lib/api";
import { hasPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { CreateEtiquetaPayload, Etiqueta, UpdateEtiquetaPayload } from "@/types/ventas";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function EtiquetasPage() {
  const permisos = useAuthStore((s) => s.permisos);
  const canCreate = hasPermission(permisos, "etiquetas:crear");
  const canEdit = hasPermission(permisos, "etiquetas:editar");
  const canDesactivar = hasPermission(permisos, "etiquetas:desactivar");

  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formRequiereComprobante, setFormRequiereComprobante] = useState(true);
  const [formOrden, setFormOrden] = useState("0");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadEtiquetas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await etiquetasApi.listEtiquetas({ pagina: 1, limite: 50 });
      setEtiquetas(res.data);
      setError(null);
    } catch (err: unknown) {
      setError(errorMessage(err, "No se pudieron cargar las billeteras."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadEtiquetas();
    });
    return () => { cancelled = true; };
  }, [loadEtiquetas]);

  const openCreate = () => {
    setEditingId(null);
    setFormNombre("");
    setFormRequiereComprobante(true);
    setFormOrden("0");
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (etiqueta: Etiqueta) => {
    setEditingId(etiqueta.id);
    setFormNombre(etiqueta.nombre);
    setFormRequiereComprobante(etiqueta.requiereComprobante);
    setFormOrden(String(etiqueta.orden));
    setFormError(null);
    setShowModal(true);
  };

  const submitForm = async () => {
    if (!formNombre.trim()) { setFormError("El nombre es obligatorio."); return; }
    const orden = parseInt(formOrden, 10);
    if (isNaN(orden) || orden < 0) { setFormError("El orden debe ser un número ≥ 0."); return; }
    setFormSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        const payload: UpdateEtiquetaPayload = {
          nombre: formNombre.trim(),
          requiereComprobante: formRequiereComprobante,
          orden,
        };
        await etiquetasApi.updateEtiqueta(editingId, payload);
        toast.success("Billetera actualizada");
      } else {
        const payload: CreateEtiquetaPayload = {
          nombre: formNombre.trim(),
          requiereComprobante: formRequiereComprobante,
          orden,
        };
        await etiquetasApi.createEtiqueta(payload);
        toast.success("Billetera creada");
      }
      setShowModal(false);
      await loadEtiquetas();
    } catch (err: unknown) {
      setFormError(errorMessage(err, "No se pudo guardar la billetera."));
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggle = async (etiqueta: Etiqueta) => {
    try {
      await etiquetasApi.toggleEtiqueta(etiqueta.id, !etiqueta.activo);
      toast.success(etiqueta.activo ? "Billetera desactivada" : "Billetera activada");
      await loadEtiquetas();
    } catch (err: unknown) {
      toast.error(errorMessage(err, "No se pudo cambiar el estado."));
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Wallet size={22} className="text-amber-500" />
              Billeteras Digitales
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona los métodos de pago digitales: Yape, Plin, Agora y otras billeteras autorizadas.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadEtiquetas()}
              disabled={loading}
              className="grid size-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-amber-500 disabled:opacity-50"
              aria-label="Actualizar"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={openCreate}
                className="flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
              >
                <Plus size={16} /> Nueva billetera
              </button>
            )}
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {/* Aviso de negocio */}
        <div className="rounded-lg border border-blue-500/25 bg-blue-500/5 p-4">
          <p className="text-sm font-semibold text-blue-400">💡 Solo billeteras digitales</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Las etiquetas representan únicamente billeteras digitales (Yape, Plin, Agora, etc.).
            No deben representar tarjetas, retiros, depósitos ni gastos genéricos.
          </p>
        </div>

        <Bones
          name="etiquetas"
          loading={loading}
          onRetry={() => void loadEtiquetas()}
          placeholder={
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Bone className="size-11 shrink-0" />
                      <div className="space-y-2">
                        <Bone className="h-5 w-24" />
                        <Bone className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Bone className="size-9" />
                      <Bone className="size-9" />
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-border pt-2" style={{ opacity: 0.5 }}>
                    <Bone className="h-6 w-32" />
                    <Bone className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          {etiquetas.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/10">
              <div className="text-center">
                <Wallet size={40} className="mx-auto text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  No hay billeteras configuradas
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Crea tu primera billetera para comenzar
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...etiquetas]
                .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
                .map((etiqueta) => (
                  <div
                    key={etiqueta.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-md",
                      !etiqueta.activo && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-lg border",
                          etiqueta.activo
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                            : "border-border bg-muted text-muted-foreground",
                        )}>
                          <Wallet size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{etiqueta.nombre}</span>
                            {!etiqueta.activo && (
                              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                INACTIVA
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">Orden: {etiqueta.orden}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(etiqueta)}
                            className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-amber-500"
                            aria-label="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDesactivar && (
                          <button
                            type="button"
                            onClick={() => void handleToggle(etiqueta)}
                            className={cn(
                              "grid size-9 place-items-center rounded-lg border transition-colors",
                              etiqueta.activo
                                ? "border-border text-muted-foreground hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-amber-500"
                                : "border-emerald-500/30 text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/5",
                            )}
                            aria-label={etiqueta.activo ? "Desactivar" : "Activar"}
                          >
                            {etiqueta.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-muted pt-2">
                      <span className={cn(
                        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                        etiqueta.requiereComprobante
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}>
                        {etiqueta.requiereComprobante
                          ? <><CheckCircle2 size={12} /> Requiere comprobante</>
                          : <><XCircle size={12} /> Sin comprobante</>}
                      </span>
                      {etiqueta.sedeId ? (
                        <span className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          Sede específica
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                          Global
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Bones>
      </div>

      {/* Modal crear/editar */}
      {showModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm animate-scale-in rounded-2xl border border-border bg-card p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-foreground">
                  {editingId ? "Editar billetera" : "Nueva billetera"}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Nombre *
                  <input
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej: Yape, Plin, Agora"
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground outline-none focus:border-amber-500/60"
                  />
                </label>

                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Orden de visualización
                  <input
                    type="number"
                    min="0"
                    value={formOrden}
                    onChange={(e) => setFormOrden(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground outline-none focus:border-amber-500/60"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={formRequiereComprobante}
                    onChange={(e) => setFormRequiereComprobante(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="text-xs text-foreground">
                    Requiere comprobante al clasificar un pago
                  </span>
                </label>
              </div>

              {formError && (
                <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {formError}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void submitForm()}
                  disabled={formSaving}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-amber-500 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {formSaving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
