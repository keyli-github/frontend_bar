export type CajaEstado = "ABIERTA" | "CERRADA";
export type CajaVersion = "V1" | "V2";
export type CajaMovimientoTipo = "ENTRADA" | "SALIDA";
export type CajaMovimientoOrigen =
  | "MANUAL"
  | "VENTA"
  | "PAGO_NO_EFECTIVO"
  | "BILLETERA_DIGITAL"
  | "ANULACION_VENTA"
  | "ANULACION_DIGITAL";
/**
 * @deprecated medioPago solo se usa en sesiones V1 (legacy).
 * En sesiones V2 es null; el método de pago se registra en ConciliacionVenta.
 */
/**
 * @deprecated Solo para sesiones V1 (legacy). En V2 medioPago es null.
 * TARJETA no está permitida por reglas de negocio, pero se mantiene en el tipo
 * para no romper la deserialización de datos históricos V1.
 */
export type CajaMedioPago =
  | "EFECTIVO"
  | "YAPE"
  | "TRANSFERENCIA"
  | "TARJETA" // legacy V1 — no permitido en operaciones nuevas
  | "OTRO";

export interface CajaUserRef {
  id: string;
  username: string;
}

export interface CajaSedeRef {
  id: string;
  nombre: string;
}

// ── Resumen V1 (legacy) ─────────────────────────────────────────────────────

export interface CajaResumenV1 {
  version: "V1";
  totalEntradas: number;
  totalSalidas: number;
  saldoEsperado: number;
}

// ── Resumen V2 (nuevo modelo de ventas + conciliación) ───────────────────────

export interface CajaBilleteraResumen {
  conciliacionId: string | null;
  total: number;
  cantidad: number;
}

export interface CajaVendedoraResumen {
  vendedoraId: string;
  username: string;
  cantidadVentas: number;
  totalVentas: number;
}

export interface CajaProductoResumen {
  productoId: string;
  codigo: string;
  nombre: string;
  cantidadTotal: number;
  montoTotal: number;
}

export interface CajaResumenV2 {
  version: "V2";
  totalVentasBruto: number;
  totalAnulaciones: number;
  totalVentasNeto: number;
  totalDigitalBruto: number;
  totalReversDigital: number;
  totalDigitalNeto: number;
  efectivoEsperado: number;
  /** Ventas ACTIVAS sin clasificar aún como EFECTIVO o BILLETERA. */
  ventasPendientes: number;
  cantidadVentas: number;
  cantidadAnuladas: number;
  porBilletera: CajaBilleteraResumen[];
  porVendedora: CajaVendedoraResumen[];
  resumenProductos: CajaProductoResumen[];
}

export type CajaResumen = CajaResumenV1 | CajaResumenV2;

/** Extrae el saldo esperado de cualquier versión del resumen. */
export function getSaldoEsperado(resumen: CajaResumen): number {
  if (resumen.version === "V2") return resumen.efectivoEsperado;
  return resumen.saldoEsperado;
}

// ── Denominaciones ─────────────────────────────────────────────────────────

export const CAJA_DENOMINACIONES = [
  200, 100, 50, 20, 10, 5, 2, 1, 0.2, 0.1,
] as const;
export type CajaDenominacionValor = (typeof CAJA_DENOMINACIONES)[number];

export interface CajaDenominacion {
  denominacion: CajaDenominacionValor;
  cantidad: number;
  subtotal: number;
}

// ── Sesión de caja ──────────────────────────────────────────────────────────

export interface CajaSesionBase {
  id: string;
  sedeId: string;
  sede: CajaSedeRef;
  estado: CajaEstado;
  version: CajaVersion;
  /** true si se cerró con ventas PENDIENTES sin clasificar */
  cierreForzado: boolean;
  motivoCierreForzado: string | null;
  montoApertura: number;
  denominaciones: CajaDenominacion[];
  abiertaAt: string;
  usuarioApertura: CajaUserRef;
  precuadreAt: string | null;
  montoDeclaradoPrecuadre: number | null;
  saldoEsperadoPrecuadre: number | null;
  diferenciaPrecuadre: number | null;
  usuarioPrecuadre: CajaUserRef | null;
  cerradaAt: string | null;
  montoDeclaradoCierre: number | null;
  saldoEsperadoCierre: number | null;
  diferenciaCierre: number | null;
  usuarioCierre: CajaUserRef | null;
  observacionesCierre: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fila de `GET /caja/historial`; el listado no calcula el resumen. */
export type CajaSesionHistorial = CajaSesionBase;

/** Respuesta detallada de caja, incluida la sesion actual. */
export interface CajaSesion extends CajaSesionBase {
  resumen: CajaResumen;
}

export type CajaDetalle = CajaSesion;

// ── Queries ─────────────────────────────────────────────────────────────────

export interface CajaHistorialQuery {
  pagina?: number;
  limite?: number;
  sedeId?: string;
  estado?: CajaEstado;
}

export interface CajaMovimientosQuery {
  pagina?: number;
  limite?: number;
  tipo?: CajaMovimientoTipo;
}

// ── Movimiento de caja ──────────────────────────────────────────────────────

export interface CajaMovimiento {
  id: string;
  cajaSesionId: string;
  sedeId: string;
  tipo: CajaMovimientoTipo;
  origen: CajaMovimientoOrigen;
  /** null en sesiones V2 */
  medioPago: CajaMedioPago | null;
  concepto: string;
  monto: number;
  ventaId: string | null;
  conciliacionId: string | null;
  referencia: string | null;
  comprobante: string | null;
  usuario: CajaUserRef | null;
  createdAt: string;
}

// ── Payloads ─────────────────────────────────────────────────────────────────

export interface AbrirCajaPayload {
  denominaciones: Array<{
    denominacion: CajaDenominacionValor;
    cantidad: number;
  }>;
  sedeId?: string;
}

export interface ArqueoCajaPayload {
  montoDeclarado: number;
  observaciones?: string;
}

/** Cierre V2 — permite forzar cierre con ventas PENDIENTES sin clasificar. */
export interface CierreV2Payload extends ArqueoCajaPayload {
  forzarPendientes?: boolean;
  motivoForzado?: string;
}
