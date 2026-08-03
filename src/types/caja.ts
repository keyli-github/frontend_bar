export type CajaEstado = "ABIERTA" | "CERRADA";
export type CajaMovimientoTipo = "ENTRADA" | "SALIDA";
export type CajaMovimientoOrigen = "MANUAL" | "VENTA" | "PAGO_NO_EFECTIVO";
export type CajaMedioPago =
  "EFECTIVO" | "YAPE" | "TRANSFERENCIA" | "TARJETA" | "OTRO";

export interface CajaUserRef {
  id: string;
  username: string;
}

export interface CajaSedeRef {
  id: string;
  nombre: string;
}

export interface CajaResumen {
  totalEntradas: number;
  totalSalidas: number;
  saldoEsperado: number;
}

export const CAJA_DENOMINACIONES = [
  200, 100, 50, 20, 10, 5, 2, 1, 0.2, 0.1,
] as const;
export type CajaDenominacionValor = (typeof CAJA_DENOMINACIONES)[number];

export interface CajaDenominacion {
  denominacion: CajaDenominacionValor;
  cantidad: number;
  subtotal: number;
}

export interface CajaSesionBase {
  id: string;
  sedeId: string;
  sede: CajaSedeRef;
  estado: CajaEstado;
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

export interface CajaMovimiento {
  id: string;
  cajaSesionId: string;
  sedeId: string;
  tipo: CajaMovimientoTipo;
  origen: CajaMovimientoOrigen;
  medioPago: CajaMedioPago;
  concepto: string;
  monto: number;
  referencia: string | null;
  comprobante: string | null;
  usuario: CajaUserRef | null;
  createdAt: string;
}

export interface AbrirCajaPayload {
  denominaciones: Array<{
    denominacion: CajaDenominacionValor;
    cantidad: number;
  }>;
  sedeId?: string;
}

export interface MovimientoCajaPayload {
  tipo: CajaMovimientoTipo;
  origen: CajaMovimientoOrigen;
  medioPago: CajaMedioPago;
  concepto: string;
  monto: number;
  referencia?: string;
  comprobante?: string;
}

export interface ArqueoCajaPayload {
  montoDeclarado: number;
  observaciones?: string;
}
