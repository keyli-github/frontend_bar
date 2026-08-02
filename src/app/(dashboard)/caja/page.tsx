"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  Landmark,
  LockKeyhole,
  PlusCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import * as cajaApi from "@/lib/api/caja.api";
import { listEstablecimientos } from "@/lib/api/establecimientos.api";
import { formatCurrency } from "@/lib/format";
import { hasPermission } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { Establecimiento } from "@/types/api";
import {
  CAJA_DENOMINACIONES,
  type CajaMedioPago,
  type CajaMovimiento,
  type CajaMovimientoTipo,
  type CajaSesion,
} from "@/types/caja";

type ArqueoMode = "precuadre" | "cierre";
type MovimientoMode = "entrada" | "salida";
const FIELD_CLASS =
  "h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground outline-none focus:border-amber-500/60";

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
            ? "VENTA"
            : digital
              ? "PAGO_NO_EFECTIVO"
              : "MANUAL",
        medioPago: selectedMethod,
        concepto: concepto.trim(),
        monto,
        referencia: referencia.trim() || undefined,
        comprobante: comprobante.trim() || undefined,
      });
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
      } else {
        await cajaApi.cerrarCaja(caja.id, {
          montoDeclarado: monto,
          observaciones: observaciones.trim() || undefined,
        });
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
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Control de Caja
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Apertura, precuadre y cierre por sede · Moneda PEN
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSuperadmin && (
              <select
                value={sedeId}
                onChange={(event) => setSedeId(event.target.value)}
                className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
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
              onClick={() => void loadCaja()}
              disabled={loading || !effectiveSedeId}
              className="grid size-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50"
              aria-label="Actualizar caja"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {!loading && !caja && (
          <section className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-500/10 text-amber-500">
              <Landmark size={25} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Caja cerrada
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedSedeName}
            </p>
            {canOpen ? (
              <div className="mx-auto mt-6 max-w-xl text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Conteo del fondo de apertura
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {CAJA_DENOMINACIONES.map((denominacion) => (
                    <label
                      key={denominacion}
                      className="rounded-xl border border-border bg-muted/30 p-2 text-center"
                    >
                      <span className="block text-xs font-bold text-foreground">
                        S/ {denominacion.toFixed(denominacion < 1 ? 2 : 0)}
                      </span>
                      <span className="mt-0.5 block text-[9px] uppercase tracking-wider text-muted-foreground">
                        {denominacion >= 10 ? "Billetes" : "Monedas"}
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
                        className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-2 text-center font-mono text-sm text-foreground outline-none focus:border-amber-500/60"
                        placeholder="0"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-500/10 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total calculado
                  </span>
                  <strong className="font-mono text-xl text-amber-500">
                    {formatCurrency(montoApertura)}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => void abrir()}
                  disabled={saving || !effectiveSedeId}
                  className="mt-3 h-11 w-full rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  ABRIR CAJA
                </button>
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                No tienes permiso para abrir caja.
              </p>
            )}
          </section>
        )}

        {caja && (
          <>
            <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-emerald-500">
                    Caja abierta
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedSedeName} · {formatDateTime(caja.abiertaAt)} ·{" "}
                  {caja.usuarioApertura.username}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canMove && (
                  <>
                    <button
                      type="button"
                      onClick={() => openMovimiento("entrada")}
                      className="flex h-10 items-center gap-2 rounded-lg border border-emerald-500/30 px-3 text-sm font-medium text-emerald-500 hover:bg-emerald-500/10"
                    >
                      <ArrowUp size={16} /> Registrar entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => openMovimiento("salida")}
                      className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      <PlusCircle size={16} /> Registrar salida
                    </button>
                  </>
                )}
                {canPreclose && (
                  <button
                    type="button"
                    onClick={() => setArqueoMode("precuadre")}
                    className="flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 px-3 text-sm font-medium text-amber-500 hover:bg-amber-500/10"
                  >
                    <Calculator size={16} /> Precuadre
                  </button>
                )}
                {canClose && (
                  <button
                    type="button"
                    onClick={() => setArqueoMode("cierre")}
                    className="flex h-10 items-center gap-2 rounded-lg border border-red-500/30 px-3 text-sm font-medium text-red-500 hover:bg-red-500/10"
                  >
                    <LockKeyhole size={16} /> Cerrar caja
                  </button>
                )}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["APERTURA", caja.montoApertura, "text-foreground"],
                ["ENTRADAS", caja.resumen.totalEntradas, "text-emerald-500"],
                ["SALIDAS", caja.resumen.totalSalidas, "text-red-500"],
                [
                  "SALDO ESPERADO",
                  caja.resumen.saldoEsperado,
                  "text-amber-500",
                ],
              ].map(([label, value, tone]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-border bg-card px-4 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {label}
                  </p>
                  <p className={cn("mt-1 font-mono text-lg font-bold", tone)}>
                    {formatCurrency(Number(value))}
                  </p>
                </div>
              ))}
            </section>

            {caja.precuadreAt && (
              <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm">
                <p className="font-semibold text-amber-500">
                  Último precuadre: {formatDateTime(caja.precuadreAt)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Declarado {formatCurrency(caja.montoDeclaradoPrecuadre ?? 0)}{" "}
                  · Diferencia {formatCurrency(caja.diferenciaPrecuadre ?? 0)}
                </p>
              </section>
            )}

            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-semibold text-foreground">
                  Movimientos del turno
                </h2>
                <span className="text-xs text-muted-foreground">
                  {movimientos.length} registros
                </span>
              </div>
              {movimientos.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Aún no hay movimientos.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
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
                            className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {movimientos.map((movimiento) => (
                        <tr key={movimiento.id} className="hover:bg-muted/30">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                            {formatDateTime(movimiento.createdAt)}
                          </td>
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3 text-foreground">
                            {movimiento.concepto}
                          </td>
                          <td className="px-4 py-3 font-medium text-muted-foreground">
                            {movimiento.medioPago}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 font-mono font-semibold",
                              movimiento.tipo === "ENTRADA"
                                ? "text-emerald-500"
                                : "text-red-500",
                            )}
                          >
                            {movimiento.tipo === "ENTRADA" ? "+" : "-"}
                            {formatCurrency(movimiento.monto)}
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-xs text-muted-foreground">
                            {movimiento.comprobante ??
                              movimiento.referencia ??
                              "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
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

      {showMovimiento && caja && (
        <Modal
          title={`REGISTRAR ${movimientoMode.toUpperCase()}`}
          onClose={() => !saving && setShowMovimiento(false)}
        >
          <div className="space-y-4">
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
                    ? "Ej. venta mesa 4"
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
        </Modal>
      )}

      {arqueoMode && caja && (
        <Modal
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
          <div className="space-y-4">
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
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
      <span className="mt-1.5 block normal-case tracking-normal">
        {children}
      </span>
    </label>
  );
}
