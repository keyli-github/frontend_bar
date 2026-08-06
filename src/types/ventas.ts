/**
 * Tipos del módulo de Ventas y Etiquetas (billeteras digitales).
 * Espejo manual de los DTOs y respuestas del backend (NestJS).
 */

import type { PaginationQuery } from './api';

// ============================================================
// ETIQUETAS (billeteras digitales)
// ============================================================

/** Billetera digital configurada (Yape, Plin, Agora, etc.). */
export interface Etiqueta {
  id: string;
  nombre: string;
  activo: boolean;
  /** null = disponible en todas las sedes */
  sedeId: string | null;
  requiereComprobante: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

export interface EtiquetaQuery extends PaginationQuery {
  sedeId?: string;
  soloActivas?: boolean;
}

export interface CreateEtiquetaPayload {
  nombre: string;
  sedeId?: string;
  requiereComprobante?: boolean;
  orden?: number;
}

export interface UpdateEtiquetaPayload {
  nombre?: string;
  requiereComprobante?: boolean;
  orden?: number;
}

// ============================================================
// CONCILIACIÓN
// ============================================================

export type EstadoConciliacion = 'PENDIENTE' | 'EFECTIVO' | 'BILLETERA';

/** Registro de clasificación del método de pago de una venta. */
export interface ConciliacionVenta {
  id: string;
  ventaId: string;
  estado: EstadoConciliacion;
  etiquetaId: string | null;
  etiqueta?: Pick<Etiqueta, 'id' | 'nombre'>;
  /** = venta.total cuando estado = BILLETERA */
  monto: number | null;
  comprobante: string | null;
  codigoOperacion: string | null;
  clasificadoPorId: string | null;
  clasificadoPor?: { id: string; username: string };
  clasificadaAt: string | null;
}

// ============================================================
// VENTAS
// ============================================================

export type EstadoVenta = 'ACTIVA' | 'ANULADA';

export interface VentaItemResponse {
  id: string;
  productoId: string;
  producto?: { nombre: string; codigo: string; unidad?: string };
  /** Cantidad de unidades vendidas (entero positivo). */
  cantidad: number;
  /** Precio unitario al momento de la venta (snapshot de Producto.precioVenta). */
  precioUnitario: number;
  /** = cantidad × precioUnitario, calculado por el backend. */
  subtotal: number;
}

/** Venta registrada (respuesta del backend). */
export interface Venta {
  id: string;
  /** Código visible: V-{SEDE}-{YYYY}-{NNNN} */
  codigo: string;
  cajaSesionId: string;
  sedeId: string;
  vendedora?: { id: string; username: string };
  /** Total calculado por el backend (suma de subtotales). */
  total: number;
  estado: EstadoVenta;
  motivoAnulacion: string | null;
  anuladaAt: string | null;
  /** Clasificación del método de pago (nunca guardada en la propia venta). */
  conciliacion: ConciliacionVenta | null;
  items: VentaItemResponse[];
  createdAt: string;
  updatedAt: string;
}

// ── Queries ──────────────────────────────────────────────────

export interface VentaQuery extends PaginationQuery {
  estado?: EstadoVenta;
  vendedoraId?: string;
  cajaSesionId?: string;
  /** Solo SUPERADMIN */
  sedeId?: string;
}

// ── Payloads ─────────────────────────────────────────────────

export interface VentaItemInput {
  productoId: string;
  /** Entero positivo (mínimo 1). El backend calcula precio y subtotal. */
  cantidad: number;
}

/**
 * Payload para POST /api/ventas.
 *
 * IDEMPOTENCY:
 * - `idempotencyKey` = `crypto.randomUUID()` generado en el cliente.
 * - En reintento por error de red: enviar EL MISMO UUID.
 * - Para una venta diferente: generar un UUID nuevo.
 * - El `requestHash` es generado por el backend; no enviarlo.
 */
export interface CreateVentaPayload {
  idempotencyKey: string;
  items: VentaItemInput[];
}

/** PATCH /api/ventas/:id/conciliacion */
export interface ConciliarVentaPayload {
  estado: 'EFECTIVO' | 'BILLETERA';
  /** Obligatorio cuando estado = BILLETERA */
  etiquetaId?: string;
  comprobante?: string;
  codigoOperacion?: string;
}

/** POST /api/ventas/:id/anular */
export interface AnularVentaPayload {
  motivo: string;
}
