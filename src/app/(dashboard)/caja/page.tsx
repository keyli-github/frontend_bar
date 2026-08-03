"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Calculator,
  Eye,
  History,
  Landmark,
  LockKeyhole,
  PlusCircle,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Bone, Bones, BoneTable } from "@/components/shared/bones";
import { ModalShell } from "@/components/shared/modal-shell";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { ApiError, cajaApi } from "@/lib/api";
import { listEstablecimientos } from "@/lib/api/establecimientos.api";
import { formatCurrency } from "@/lib/format";
import { hasPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { Establecimiento } from "@/types/api";
import {
  CAJA_DENOMINACIONES,
  type CajaDetalle,
  type CajaEstado,
  type CajaMedioPago,
  type CajaMovimiento,
  type CajaMovimientoTipo,
  type CajaSesion,
  type CajaSesionHistorial,
} from "@/types/caja";

type ArqueoMode = "precuadre" | "cierre";
type MovimientoMode = "entrada" | "salida";
type CajaTab = "actual" | "historial";
const HISTORY_PAGE_SIZE = 10;
const DETAIL_MOVEMENTS_PAGE_SIZE = 10;
const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground outline-none transition-colors focus:border-amber-500/60";

const emptyDenominationCounts = () =>
  Object.fromEntries(
    CAJA_DENOMINACIONES.map((denominacion) => [String(denominacion), ""]),
  ) as Record<string, string>;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function CajaPage() {
  const user = useAuthStore((state) => state.user);
  const permisos = useAuthStore((state) => state.permisos);
  const canOpen = hasPermission(permisos, "caja:aperturar");
  const canMove = hasPermission(permisos, "caja:movimientos");
  const canPreclose = hasPermission(permisos, "caja:precuadre");
  const canClose = hasPermission(permisos, "caja:cerrar");
  const isSuperadmin = user?.rol === "SUPERADMIN";

  const [sedes, setSedes] = useState<Establecimiento[]>([]);
  const [sedeId, setSedeId] = useState(user?.sedeId ?? "");
  const effectiveSedeId = isSuperadmin ? sedeId : (user?.sedeId ?? "");
  const [caja, setCaja] = useState<CajaSesion | null>(null);
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CajaTab>("actual");

  const [historyRows, setHistoryRows] = useState<CajaSesionHistorial[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyEstado, setHistoryEstado] = useState<"" | CajaEstado>("");
  const [historySedeId, setHistorySedeId] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [selectedCajaId, setSelectedCajaId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CajaDetalle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailMovimientos, setDetailMovimientos] = useState<CajaMovimiento[]>([]);
  const [detailMovPage, setDetailMovPage] = useState(1);
  const [detailMovTotal, setDetailMovTotal] = useState(0);
  const [detailMovTotalPages, setDetailMovTotalPages] = useState(1);
  const [detailMovTipo, setDetailMovTipo] =
    useState<"" | CajaMovimientoTipo>("");
  const [detailMovLoading, setDetailMovLoading] = useState(false);
  const [detailMovError, setDetailMovError] = useState<string | null>(null);

  const [denominationCounts, setDenominationCounts] = useState(
    emptyDenominationCounts,
  );
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [movimientoMode, setMovimientoMode] =
    useState<MovimientoMode>("entrada");
  const [concepto, setConcepto] = useState("");
  const [montoMovimiento, setMontoMovimiento] = useState("");
  const [medioPago, setMedioPago] = useState<CajaMedioPago>("EFECTIVO");
  const [referencia, setReferencia] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [arqueoMode, setArqueoMode] = useState<ArqueoMode | null>(null);
  const [montoDeclarado, setMontoDeclarado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const loadRequestId = useRef(0);
  const historyRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const detailMovRequestId = useRef(0);
  const montoApertura = CAJA_DENOMINACIONES.reduce(
    (total, denominacion) =>
      total + denominacion * Number(denominationCounts[String(denominacion)] || 0),
    0,
  );

  useEffect(() => {
    if (!isSuperadmin) {
      return;
    }
    let cancelled = false;
    listEstablecimientos({ pagina: 1, limite: 100 })
      .then((response) => {
        if (cancelled) return;
        const active = response.data.filter((sede) => sede.activo);
        setSedes(active);
        setSedeId((current) => current || active[0]?.id || "");
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(errorMessage(reason, "No se pudieron cargar las sedes."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperadmin, user?.sedeId]);

  const loadCaja = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    if (!effectiveSedeId) {
      setCaja(null);
      setMovimientos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const current = await cajaApi.getCajaActual(effectiveSedeId);
      if (requestId !== loadRequestId.current) return;

      setCaja(current);
      const page = current
        ? await cajaApi.listMovimientosCaja(current.id, { limite: 100 })
        : null;
      if (requestId !== loadRequestId.current) return;

      setMovimientos(page?.data ?? []);
      setError(null);
    } catch (reason) {
      if (requestId !== loadRequestId.current) return;

      setCaja(null);
      setMovimientos([]);
      setError(errorMessage(reason, "No se pudo cargar la caja."));
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, [effectiveSedeId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return loadCaja();
    });
    return () => {
      cancelled = true;
    };
  }, [loadCaja]);

  const loadHistory = useCallback(async () => {
    const requestId = ++historyRequestId.current;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const page = await cajaApi.getCajaHistorial({
        pagina: historyPage,
        limite: HISTORY_PAGE_SIZE,
        estado: historyEstado || undefined,
        sedeId:
          isSuperadmin && historySedeId ? historySedeId : undefined,
      });
      if (requestId !== historyRequestId.current) return;
      setHistoryRows(page.data);
      setHistoryTotal(page.total);
      setHistoryTotalPages(page.totalPaginas || 1);
      setHistoryError(null);
    } catch (reason) {
      if (requestId !== historyRequestId.current) return;
      setHistoryRows([]);
      setHistoryTotal(0);
      setHistoryTotalPages(1);
      setHistoryError(
        errorMessage(reason, "No se pudo cargar el historial de caja."),
      );
    } finally {
      if (requestId === historyRequestId.current) {
        setHistoryLoading(false);
      }
    }
  }, [historyEstado, historyPage, historySedeId, isSuperadmin]);

  useEffect(() => {
    if (activeTab !== "historial") return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return loadHistory();
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, loadHistory]);

  const openHistoryDetail = async (cajaId: string) => {
    const requestId = ++detailRequestId.current;
    const movementsRequestId = ++detailMovRequestId.current;
    setSelectedCajaId(cajaId);
    setDetail(null);
    setDetailMovimientos([]);
    setDetailMovTotal(0);
    setDetailMovTotalPages(1);
    setDetailMovPage(1);
    setDetailMovTipo("");
    setDetailLoading(true);
    setDetailMovLoading(true);
    setDetailError(null);
    setDetailMovError(null);
    try {
      const [sessionResult, movementsResult] = await Promise.allSettled([
        cajaApi.getCajaDetalle(cajaId),
        cajaApi.listMovimientosCaja(cajaId, {
          pagina: 1,
          limite: DETAIL_MOVEMENTS_PAGE_SIZE,
        }),
      ]);
      if (requestId !== detailRequestId.current) return;

      if (sessionResult.status === "fulfilled") {
        setDetail(sessionResult.value);
      } else {
        setDetailError(
          errorMessage(
            sessionResult.reason,
            "No se pudo cargar el detalle de caja.",
          ),
        );
      }
      if (
        movementsRequestId === detailMovRequestId.current &&
        movementsResult.status === "fulfilled"
      ) {
        setDetailMovimientos(movementsResult.value.data);
        setDetailMovTotal(movementsResult.value.total);
        setDetailMovTotalPages(movementsResult.value.totalPaginas || 1);
        setDetailMovError(null);
      } else if (
        movementsRequestId === detailMovRequestId.current &&
        movementsResult.status === "rejected"
      ) {
        setDetailMovError(
          errorMessage(
            movementsResult.reason,
            "No se pudieron cargar los movimientos.",
          ),
        );
      }
    } catch (reason) {
      if (requestId !== detailRequestId.current) return;
      setDetailError(
        errorMessage(reason, "No se pudo cargar el detalle de caja."),
      );
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
      if (movementsRequestId === detailMovRequestId.current) {
        setDetailMovLoading(false);
      }
    }
  };

  const loadDetailMovimientos = async (
    page: number,
    tipo: "" | CajaMovimientoTipo,
  ) => {
    if (!selectedCajaId) return;
    const requestId = ++detailMovRequestId.current;
    setDetailMovLoading(true);
    setDetailMovError(null);
    try {
      const result = await cajaApi.listMovimientosCaja(selectedCajaId, {
        pagina: page,
        limite: DETAIL_MOVEMENTS_PAGE_SIZE,
        tipo: tipo || undefined,
      });
      if (requestId !== detailMovRequestId.current) return;
      setDetailMovimientos(result.data);
      setDetailMovTotal(result.total);
      setDetailMovTotalPages(result.totalPaginas || 1);
      setDetailMovError(null);
    } catch (reason) {
      if (requestId !== detailMovRequestId.current) return;
      setDetailMovimientos([]);
      setDetailMovTotal(0);
      setDetailMovTotalPages(1);
      setDetailMovError(
        errorMessage(reason, "No se pudieron cargar los movimientos."),
      );
    } finally {
      if (requestId === detailMovRequestId.current) {
        setDetailMovLoading(false);
      }
    }
  };

  const closeHistoryDetail = () => {
    detailRequestId.current += 1;
    detailMovRequestId.current += 1;
    setSelectedCajaId(null);
    setDetail(null);
    setDetailError(null);
    setDetailMovError(null);
  };

  const abrir = async () => {
    const denominaciones = CAJA_DENOMINACIONES.map((denominacion) => ({
      denominacion,
      cantidad: Number(denominationCounts[String(denominacion)] || 0),
    }));
    if (
      denominaciones.some(
        ({ cantidad }) =>
          !Number.isInteger(cantidad) || cantidad < 0 || cantidad > 999999,
      )
    ) {
      setError("La cantidad de cada denominación debe ser un entero válido.");
      return;
    }
    setSaving(true);
    try {
      await cajaApi.abrirCaja({
        denominaciones,
        ...(isSuperadmin ? { sedeId } : {}),
      });
      toast.success("Caja abierta correctamente");
      setDenominationCounts(emptyDenominationCounts());
      await loadCaja();
    } catch (reason) {
      setError(errorMessage(reason, "No se pudo abrir la caja."));
    } finally {
      setSaving(false);
    }
  };

  const openMovimiento = (mode: MovimientoMode) => {
    setMovimientoMode(mode);
    setShowMovimiento(true);
    setConcepto("");
    setMontoMovimiento("");
    setMedioPago("EFECTIVO");
    setReferencia("");
    setComprobante("");
    setError(null);
  };

  const registrarMovimiento = async () => {
    if (!caja) return;
    const monto = Number(montoMovimiento);
    if (!concepto.trim() || !Number.isFinite(monto) || monto <= 0) {
      setError("Completa el concepto y un monto mayor a cero.");
      return;
    }
    const selectedMethod =
      movimientoMode === "entrada" ? "EFECTIVO" : medioPago;
    const digital =
      selectedMethod === "YAPE" || selectedMethod === "TRANSFERENCIA";
    if (digital && !comprobante.trim()) {
      setError("Yape y transferencia requieren voucher o comprobante.");
      return;
    }
    const tipo: CajaMovimientoTipo =
      movimientoMode === "entrada" ? "ENTRADA" : "SALIDA";
    setSaving(true);
    try {
      await cajaApi.registrarMovimientoCaja(caja.id, {
        tipo,
        origen:
          movimientoMode === "entrada"
            ? "MANUAL"
            : digital
              ? "PAGO_NO_EFECTIVO"
              : "MANUAL",
        medioPago: selectedMethod,
        concepto: concepto.trim(),
        monto,
        referencia: referencia.trim() || undefined,
        comprobante: comprobante.trim() || undefined,
      });
      toast.success(
        movimientoMode === "entrada"
          ? "Entrada registrada"
          : "Salida registrada",
      );
      setShowMovimiento(false);
      setConcepto("");
      setMontoMovimiento("");
      setMedioPago("EFECTIVO");
      setReferencia("");
      setComprobante("");
      await loadCaja();
    } catch (reason) {
      setError(
        errorMessage(
          reason,
          `No se pudo registrar la ${movimientoMode}.`,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmarArqueo = async () => {
    if (!caja || !arqueoMode) return;
    const monto = Number(montoDeclarado);
    if (!Number.isFinite(monto) || monto < 0) {
      setError("Ingresa el efectivo contado en caja.");
      return;
    }
    setSaving(true);
    try {
      if (arqueoMode === "precuadre") {
        await cajaApi.precuadrarCaja(caja.id, { montoDeclarado: monto });
        toast.success("Precuadre guardado");
      } else {
        await cajaApi.cerrarCaja(caja.id, {
          montoDeclarado: monto,
          observaciones: observaciones.trim() || undefined,
        });
        toast.success("Caja cerrada correctamente");
      }
      setArqueoMode(null);
      setMontoDeclarado("");
      setObservaciones("");
      await loadCaja();
    } catch (reason) {
      setError(errorMessage(reason, "No se pudo completar el arqueo."));
    } finally {
      setSaving(false);
    }
  };

  const selectedSedeName =
    caja?.sede?.nombre ??
    sedes.find((sede) => sede.id === effectiveSedeId)?.nombre ??
    user?.sede ??
    "Sin sede";

  return (
    <div className="min-h-full bg-background p-3 sm:p-4 lg:p-5">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <header className="flex flex-col gap-3 border-b border-border pb-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Control de Caja
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Operación diaria, arqueos y trazabilidad · PEN
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div
              className="inline-flex h-9 rounded-lg border border-border bg-muted/35 p-0.5"
              role="tablist"
              aria-label="Vistas de caja"
            >
              {(
                [
                  ["actual", "Caja actual", Landmark],
                  ["historial", "Historial", History],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === value}
                  onClick={() => setActiveTab(value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                    activeTab === value
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    size={14}
                    className={activeTab === value ? "text-amber-500" : undefined}
                  />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {isSuperadmin && activeTab === "actual" && (
                <select
                  value={sedeId}
                  onChange={(event) => setSedeId(event.target.value)}
                  aria-label="Sede de caja"
                  className="h-9 min-w-44 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground outline-none focus:border-amber-500/60"
                >
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() =>
                  void (activeTab === "actual" ? loadCaja() : loadHistory())
                }
                disabled={
                  activeTab === "actual"
                    ? loading || !effectiveSedeId
                    : historyLoading
                }
                className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-amber-500/40 hover:text-amber-500 disabled:opacity-50"
                aria-label={
                  activeTab === "actual"
                    ? "Actualizar caja actual"
                    : "Actualizar historial"
                }
              >
                <RefreshCw
                  size={16}
                  className={
                    (activeTab === "actual" ? loading : historyLoading)
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>
            </div>
          </div>
        </header>

        {activeTab === "actual" && (
          <Bones
            name="caja-actual"
            loading={loading}
            placeholder={<CajaCurrentSkeleton />}
          >
            <div className="space-y-4">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {!loading && !caja && (
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border bg-muted/15 px-4 py-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500">
                <Landmark size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">Caja cerrada</h2>
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sin turno
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{selectedSedeName}</p>
              </div>
            </div>
            {canOpen ? (
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Fondo de apertura</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Ingresa la cantidad física por denominación.
                    </p>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                    10 denominaciones
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10">
                  {CAJA_DENOMINACIONES.map((denominacion) => (
                    <label
                      key={denominacion}
                      className="rounded-lg border border-border bg-muted/20 p-2 text-center transition-colors focus-within:border-amber-500/50 focus-within:bg-amber-500/[0.04]"
                    >
                      <span className="block text-[11px] font-bold text-foreground">
                        S/ {denominacion.toFixed(denominacion < 1 ? 2 : 0)}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="999999"
                        step="1"
                        inputMode="numeric"
                        aria-label={`Cantidad de S/ ${denominacion}`}
                        value={denominationCounts[String(denominacion)]}
                        onChange={(event) =>
                          setDenominationCounts((current) => ({
                            ...current,
                            [String(denominacion)]: event.target.value,
                          }))
                        }
                        className="mt-1.5 h-8 w-full rounded-md border border-border bg-card px-1 text-center font-mono text-xs text-foreground outline-none focus:border-amber-500/60"
                        placeholder="0"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="block text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Total calculado
                    </span>
                    <strong className="font-mono text-lg text-amber-500">
                      {formatCurrency(montoApertura)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => void abrir()}
                    disabled={saving || !effectiveSedeId}
                    className="h-9 rounded-lg bg-amber-500 px-5 text-xs font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
                  >
                    {saving ? "ABRIENDO…" : "ABRIR CAJA"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No tienes permiso para abrir caja.
              </p>
            )}
          </section>
        )}

        {caja && (
          <>
            <section className="flex flex-col gap-3 rounded-xl border border-border bg-card px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
                  <span className="text-sm font-semibold text-emerald-500">
                    Caja abierta
                  </span>
                  <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                    {caja.id.slice(0, 8)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedSedeName} · {formatDateTime(caja.abiertaAt)} ·{" "}
                  {caja.usuarioApertura.username}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {canMove && (
                  <>
                    <button
                      type="button"
                      onClick={() => openMovimiento("entrada")}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/25 px-3 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/10"
                    >
                      <ArrowUp size={14} /> Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => openMovimiento("salida")}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <PlusCircle size={14} /> Salida
                    </button>
                  </>
                )}
                {canPreclose && (
                  <button
                    type="button"
                    onClick={() => setArqueoMode("precuadre")}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/25 px-3 text-xs font-semibold text-amber-500 transition-colors hover:bg-amber-500/10"
                  >
                    <Calculator size={14} /> Precuadre
                  </button>
                )}
                {canClose && (
                  <button
                    type="button"
                    onClick={() => setArqueoMode("cierre")}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-red-500/25 px-3 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    <LockKeyhole size={14} /> Cerrar
                  </button>
                )}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <StatCard
                label="Apertura"
                value={formatCurrency(caja.montoApertura)}
                icon={<Banknote size={14} />}
              />
              <StatCard
                label="Entradas"
                value={formatCurrency(caja.resumen.totalEntradas)}
                icon={<TrendingUp size={14} />}
                valueColor="text-emerald-500"
              />
              <StatCard
                label="Salidas"
                value={formatCurrency(caja.resumen.totalSalidas)}
                icon={<TrendingDown size={14} />}
                valueColor="text-red-500"
              />
              <StatCard
                label="Saldo esperado"
                value={formatCurrency(caja.resumen.saldoEsperado)}
                icon={<Scale size={14} />}
                valueColor="text-amber-500"
              />
            </section>

            {caja.precuadreAt && (
              <section className="flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-amber-500">
                  Último precuadre: {formatDateTime(caja.precuadreAt)}
                </p>
                <p className="text-muted-foreground">
                  Declarado {formatCurrency(caja.montoDeclaradoPrecuadre ?? 0)}{" "}
                  · Diferencia {formatCurrency(caja.diferenciaPrecuadre ?? 0)}
                </p>
              </section>
            )}

            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-muted/10 px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Movimientos del turno
                </h2>
                <span className="text-xs text-muted-foreground">
                  {movimientos.length} registros
                </span>
              </div>
              {movimientos.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aún no hay movimientos.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {[
                          "Fecha",
                          "Tipo",
                          "Concepto",
                          "Método",
                          "Monto",
                          "Comprobante",
                          "Usuario",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {movimientos.map((movimiento) => (
                        <tr key={movimiento.id} className="hover:bg-muted/30">
                          <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-muted-foreground">
                            {formatDateTime(movimiento.createdAt)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold",
                                movimiento.tipo === "ENTRADA"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-red-500/10 text-red-500",
                              )}
                            >
                              {movimiento.tipo === "ENTRADA" ? (
                                <ArrowUp size={10} />
                              ) : (
                                <ArrowDown size={10} />
                              )}
                              {movimiento.tipo}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                            {movimiento.concepto}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium text-muted-foreground">
                            {movimiento.medioPago}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 font-mono text-xs font-semibold",
                              movimiento.tipo === "ENTRADA"
                                ? "text-emerald-500"
                                : "text-red-500",
                            )}
                          >
                            {movimiento.tipo === "ENTRADA" ? "+" : "-"}
                            {formatCurrency(movimiento.monto)}
                          </td>
                          <td className="max-w-[180px] truncate px-3 py-2.5 text-[11px] text-muted-foreground">
                            {movimiento.comprobante ??
                              movimiento.referencia ??
                              "—"}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                            {movimiento.usuario?.username ?? "Sistema"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
            </div>
          </Bones>
        )}

        {activeTab === "historial" && (
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/10 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Sesiones de caja
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Consulta sesiones abiertas y cerradas registradas por el backend.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {isSuperadmin && (
                  <Field label="Sede">
                    <select
                      value={historySedeId}
                      onChange={(event) => {
                        setHistorySedeId(event.target.value);
                        setHistoryPage(1);
                        setHistoryLoading(true);
                      }}
                      className={cn(FIELD_CLASS, "h-9 text-xs sm:w-48")}
                    >
                      <option value="">Todas las sedes</option>
                      {sedes.map((sede) => (
                        <option key={sede.id} value={sede.id}>
                          {sede.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Estado">
                  <select
                    value={historyEstado}
                    onChange={(event) => {
                      setHistoryEstado(event.target.value as "" | CajaEstado);
                      setHistoryPage(1);
                      setHistoryLoading(true);
                    }}
                    className={cn(FIELD_CLASS, "h-9 text-xs sm:w-40")}
                  >
                    <option value="">Todos</option>
                    <option value="ABIERTA">Abierta</option>
                    <option value="CERRADA">Cerrada</option>
                  </select>
                </Field>
              </div>
            </div>

            {historyError && (
              <p
                role="alert"
                className="m-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {historyError}
              </p>
            )}

            <Bones
              name="caja-historial"
              loading={historyLoading}
              placeholder={<BoneTable rows={HISTORY_PAGE_SIZE} cols={7} />}
            >
              {historyError ? null : historyRows.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                  <History size={24} className="text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    No hay sesiones de caja
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No existen resultados para los filtros seleccionados.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {[
                          "Apertura",
                          "Sede",
                          "Estado",
                          "Responsable",
                          "Monto apertura",
                          "Cierre",
                          "",
                        ].map((heading, index) => (
                          <th
                            key={`${heading}-${index}`}
                            className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {historyRows.map((session) => (
                        <tr key={session.id} className="hover:bg-muted/30">
                          <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-muted-foreground">
                            {formatDateTime(session.abiertaAt)}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                            {session.sede.nombre}
                          </td>
                          <td className="px-3 py-2.5">
                            <CajaStatus estado={session.estado} />
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {session.usuarioApertura.username}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground">
                            {formatCurrency(session.montoApertura)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-muted-foreground">
                            {session.cerradaAt
                              ? formatDateTime(session.cerradaAt)
                              : "Pendiente"}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => void openHistoryDetail(session.id)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:border-amber-500/40 hover:bg-amber-500/10"
                              aria-label={`Ver detalle de caja de ${session.sede.nombre}`}
                            >
                              <Eye size={14} /> Ver detalle
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
                page={historyPage}
                totalPages={historyTotalPages}
                total={historyTotal}
                pageSize={HISTORY_PAGE_SIZE}
                onPageChange={(page) => {
                  setHistoryLoading(true);
                  setHistoryPage(page);
                }}
              />
            </div>
          </section>
        )}
      </div>

      <ModalShell
        open={Boolean(selectedCajaId)}
        title="Detalle de sesión de caja"
        subtitle={
          detail
            ? `${detail.sede.nombre} · ${formatDateTime(detail.abiertaAt)}`
            : "Consultando información del turno"
        }
        onClose={closeHistoryDetail}
        className="max-w-5xl"
      >
        {detailError && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {detailError}
          </p>
        )}
        <Bones
          name="caja-detalle"
          loading={detailLoading}
          placeholder={<CajaDetailSkeleton />}
        >
          {detail ? (
            <CajaDetailView
              detail={detail}
              movimientos={detailMovimientos}
              movementsLoading={detailMovLoading}
              movementError={detailMovError}
              movementType={detailMovTipo}
              movementPage={detailMovPage}
              movementTotal={detailMovTotal}
              movementTotalPages={detailMovTotalPages}
              onMovementTypeChange={(tipo) => {
                setDetailMovTipo(tipo);
                setDetailMovPage(1);
                void loadDetailMovimientos(1, tipo);
              }}
              onMovementPageChange={(page) => {
                setDetailMovPage(page);
                void loadDetailMovimientos(page, detailMovTipo);
              }}
            />
          ) : (
            !detailError && null
          )}
        </Bones>
      </ModalShell>

      {showMovimiento && caja && (
        <ModalShell
          open
          title={`REGISTRAR ${movimientoMode.toUpperCase()}`}
          onClose={() => !saving && setShowMovimiento(false)}
        >
          <div className="space-y-3">
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              {movimientoMode === "entrada"
                ? "Las entradas representan dinero físico que ingresó a la caja, por eso su método es únicamente EFECTIVO."
                : "Las salidas por Yape o transferencia representan dinero que no quedó físicamente en caja y requieren voucher."}
            </p>
            <Field label="Concepto">
              <input
                value={concepto}
                onChange={(event) => setConcepto(event.target.value)}
                maxLength={160}
                className={FIELD_CLASS}
                placeholder={
                  movimientoMode === "entrada"
                    ? "Ej. aporte o ajuste manual"
                    : "Ej. pago Yape de venta o compra de hielo"
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monto (S/)">
                <input
                  type="number"
                  min="0.01"
                  max="999999999.99"
                  step="0.01"
                  inputMode="decimal"
                  value={montoMovimiento}
                  onChange={(event) => setMontoMovimiento(event.target.value)}
                  className={FIELD_CLASS}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Método">
                {movimientoMode === "entrada" ? (
                  <div className={cn(FIELD_CLASS, "flex items-center font-semibold")}>
                    EFECTIVO
                  </div>
                ) : (
                  <select
                    value={medioPago}
                    onChange={(event) =>
                      setMedioPago(event.target.value as CajaMedioPago)
                    }
                    className={FIELD_CLASS}
                  >
                    {(
                      [
                        "EFECTIVO",
                        "YAPE",
                        "TRANSFERENCIA",
                        "TARJETA",
                        "OTRO",
                      ] as const
                    ).map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Referencia (opcional)">
              <input
                value={referencia}
                onChange={(event) => setReferencia(event.target.value)}
                maxLength={100}
                className={FIELD_CLASS}
              />
            </Field>
            {movimientoMode === "salida" &&
              (medioPago === "YAPE" || medioPago === "TRANSFERENCIA") && (
              <Field label="Voucher o comprobante">
                <input
                  value={comprobante}
                  onChange={(event) => setComprobante(event.target.value)}
                  maxLength={500}
                  className={FIELD_CLASS}
                  placeholder="URL, código o referencia de la captura"
                />
              </Field>
              )}
            <button
              type="button"
              onClick={() => void registrarMovimiento()}
              disabled={saving}
              className={cn(
                "h-11 w-full rounded-xl font-bold disabled:opacity-50",
                movimientoMode === "entrada"
                  ? "bg-emerald-500 text-white hover:bg-emerald-400"
                  : "bg-amber-500 text-black hover:bg-amber-400",
              )}
            >
              {saving
                ? "REGISTRANDO…"
                : `REGISTRAR ${movimientoMode.toUpperCase()}`}
            </button>
          </div>
        </ModalShell>
      )}

      {arqueoMode && caja && (
        <ModalShell
          open
          title={
            arqueoMode === "precuadre" ? "PRECUADRE DE CAJA" : "CIERRE DE CAJA"
          }
          onClose={() => !saving && setArqueoMode(null)}
        >
          <p className="mb-4 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
            Saldo esperado:{" "}
            <strong className="text-amber-500">
              {formatCurrency(caja.resumen.saldoEsperado)}
            </strong>
            . Ingresa el efectivo contado sin modificar el saldo calculado.
          </p>
          <div className="space-y-3">
            <Field label="Efectivo declarado (S/)">
              <input
                type="number"
                min="0"
                max="999999999.99"
                step="0.01"
                inputMode="decimal"
                value={montoDeclarado}
                onChange={(event) => setMontoDeclarado(event.target.value)}
                className={FIELD_CLASS}
                placeholder="0.00"
              />
            </Field>
            {arqueoMode === "cierre" && (
              <Field label="Observaciones (opcional)">
                <textarea
                  value={observaciones}
                  onChange={(event) => setObservaciones(event.target.value)}
                  maxLength={500}
                  className={cn(FIELD_CLASS, "min-h-20 py-2")}
                />
              </Field>
            )}
            <button
              type="button"
              onClick={() => void confirmarArqueo()}
              disabled={saving}
              className={cn(
                "h-11 w-full rounded-xl font-bold disabled:opacity-50",
                arqueoMode === "cierre"
                  ? "bg-red-500 text-white hover:bg-red-400"
                  : "bg-amber-500 text-black hover:bg-amber-400",
              )}
            >
              {saving
                ? "PROCESANDO…"
                : arqueoMode === "cierre"
                  ? "CONFIRMAR CIERRE"
                  : "GUARDAR PRECUADRE"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function CajaCurrentSkeleton() {
  return (
    <div className="space-y-4" aria-label="Cargando caja actual" role="status">
      <div className="rounded-xl border border-border bg-card p-3">
        <Bone className="h-4 w-32" />
        <Bone className="mt-2 h-3 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-3">
            <Bone className="h-2.5 w-20" />
            <Bone className="mt-2 h-5 w-28" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <BoneTable rows={6} cols={7} />
      </div>
    </div>
  );
}

function CajaDetailSkeleton() {
  return (
    <div className="space-y-3" aria-label="Cargando detalle de caja" role="status">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Bone key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Bone key={index} className="h-48 rounded-xl" />
        ))}
      </div>
      <Bone className="h-56 rounded-xl" />
    </div>
  );
}

function CajaStatus({ estado }: { estado: CajaEstado }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold",
        estado === "ABIERTA"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {estado}
    </span>
  );
}

function CajaDetailView({
  detail,
  movimientos,
  movementsLoading,
  movementError,
  movementType,
  movementPage,
  movementTotal,
  movementTotalPages,
  onMovementTypeChange,
  onMovementPageChange,
}: {
  detail: CajaDetalle;
  movimientos: CajaMovimiento[];
  movementsLoading: boolean;
  movementError: string | null;
  movementType: "" | CajaMovimientoTipo;
  movementPage: number;
  movementTotal: number;
  movementTotalPages: number;
  onMovementTypeChange: (tipo: "" | CajaMovimientoTipo) => void;
  onMovementPageChange: (page: number) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Apertura" value={formatCurrency(detail.montoApertura)} icon={<Banknote size={14} />} />
        <StatCard label="Entradas" value={formatCurrency(detail.resumen.totalEntradas)} icon={<TrendingUp size={14} />} valueColor="text-emerald-500" />
        <StatCard label="Salidas" value={formatCurrency(detail.resumen.totalSalidas)} icon={<TrendingDown size={14} />} valueColor="text-red-500" />
        <StatCard label="Saldo esperado" value={formatCurrency(detail.resumen.saldoEsperado)} icon={<Scale size={14} />} valueColor="text-amber-500" />
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <DetailSection title="Apertura">
          <DetailValue label="Sede" value={detail.sede.nombre} />
          <DetailValue label="Estado" value={<CajaStatus estado={detail.estado} />} />
          <DetailValue label="Fecha" value={formatDateTime(detail.abiertaAt)} />
          <DetailValue label="Usuario" value={detail.usuarioApertura.username} />
          <DetailValue label="Monto" value={formatCurrency(detail.montoApertura)} />
          <DetailValue label="Creada" value={formatDateTime(detail.createdAt)} />
          <DetailValue label="Actualizada" value={formatDateTime(detail.updatedAt)} />
        </DetailSection>

        <DetailSection title="Precuadre">
          <DetailValue
            label="Fecha"
            value={detail.precuadreAt ? formatDateTime(detail.precuadreAt) : "No realizado"}
          />
          <DetailValue
            label="Usuario"
            value={detail.usuarioPrecuadre?.username ?? "No registrado"}
          />
          <DetailValue
            label="Declarado"
            value={formatNullableCurrency(detail.montoDeclaradoPrecuadre)}
          />
          <DetailValue
            label="Esperado"
            value={formatNullableCurrency(detail.saldoEsperadoPrecuadre)}
          />
          <DetailValue
            label="Diferencia"
            value={formatNullableCurrency(detail.diferenciaPrecuadre)}
          />
        </DetailSection>

        <DetailSection title="Cierre">
          <DetailValue
            label="Fecha"
            value={detail.cerradaAt ? formatDateTime(detail.cerradaAt) : "Caja aún abierta"}
          />
          <DetailValue
            label="Usuario"
            value={detail.usuarioCierre?.username ?? "No registrado"}
          />
          <DetailValue
            label="Declarado"
            value={formatNullableCurrency(detail.montoDeclaradoCierre)}
          />
          <DetailValue
            label="Esperado"
            value={formatNullableCurrency(detail.saldoEsperadoCierre)}
          />
          <DetailValue
            label="Diferencia"
            value={formatNullableCurrency(detail.diferenciaCierre)}
          />
          <DetailValue
            label="Observaciones"
            value={detail.observacionesCierre || "Sin observaciones"}
            full
          />
        </DetailSection>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-muted/10 px-3 py-2.5">
          <h3 className="text-sm font-semibold text-foreground">
            Denominaciones de apertura
          </h3>
        </div>
        {detail.denominaciones.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No se registraron denominaciones.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5">Denominación</th>
                  <th className="px-3 py-2.5">Cantidad</th>
                  <th className="px-3 py-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detail.denominaciones.map((item) => (
                  <tr key={item.denominacion}>
                    <td className="px-3 py-2.5 font-mono text-foreground">
                      {formatCurrency(item.denominacion)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {item.cantidad}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/10 px-3 py-2.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Movimientos</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {movementTotal} registros encontrados
            </p>
          </div>
          <Field label="Tipo">
            <select
              value={movementType}
              onChange={(event) =>
                onMovementTypeChange(
                  event.target.value as "" | CajaMovimientoTipo,
                )
              }
              className={cn(FIELD_CLASS, "sm:w-36")}
            >
              <option value="">Todos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
            </select>
          </Field>
        </div>

        <Bones
          name="caja-detalle-movimientos"
          loading={movementsLoading}
          placeholder={<BoneTable rows={DETAIL_MOVEMENTS_PAGE_SIZE} cols={9} />}
        >
          {movementError ? (
            <p
              role="alert"
              className="m-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {movementError}
            </p>
          ) : movimientos.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No hay movimientos para este filtro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "Fecha",
                      "Tipo",
                      "Origen",
                      "Concepto",
                      "Medio",
                      "Monto",
                      "Referencia",
                      "Comprobante",
                      "Usuario",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movimientos.map((movimiento) => (
                    <tr key={movimiento.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-muted-foreground">
                        {formatDateTime(movimiento.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            movimiento.tipo === "ENTRADA"
                              ? "text-emerald-500"
                              : "text-red-500",
                          )}
                        >
                          {movimiento.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        {movimiento.origen}
                      </td>
                      <td className="max-w-56 px-3 py-2.5 font-medium text-foreground">
                        {movimiento.concepto}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {movimiento.medioPago}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 font-mono font-semibold",
                          movimiento.tipo === "ENTRADA"
                            ? "text-emerald-500"
                            : "text-red-500",
                        )}
                      >
                        {movimiento.tipo === "ENTRADA" ? "+" : "-"}
                        {formatCurrency(movimiento.monto)}
                      </td>
                      <td className="max-w-40 truncate px-3 py-2.5 text-[11px] text-muted-foreground">
                        {movimiento.referencia ?? "Sin referencia"}
                      </td>
                      <td className="max-w-40 truncate px-3 py-2.5 text-[11px] text-muted-foreground">
                        {movimiento.comprobante ?? "Sin comprobante"}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        {movimiento.usuario?.username ?? "Sistema"}
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
            page={movementPage}
            totalPages={movementTotalPages}
            total={movementTotal}
            pageSize={DETAIL_MOVEMENTS_PAGE_SIZE}
            onPageChange={onMovementPageChange}
          />
        </div>
      </section>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h3 className="border-b border-border pb-2.5 text-xs font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h3>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5">{children}</dl>
    </section>
  );
}

function DetailValue({
  label,
  value,
  full = false,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-xs font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

function formatNullableCurrency(value: number | null): string {
  return value === null ? "No registrado" : formatCurrency(value);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
      <span className="mt-1 block normal-case tracking-normal">
        {children}
      </span>
    </label>
  );
}
