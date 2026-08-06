import { api } from './client';
import type { Paginated } from '@/types/api';
import type {
  AnularVentaPayload,
  ConciliarVentaPayload,
  CreateVentaPayload,
  Venta,
  VentaQuery,
} from '@/types/ventas';

// ── Crear venta ──────────────────────────────────────────────────────────────

/**
 * Registra una venta nueva.
 *
 * IMPORTANTE sobre idempotencyKey:
 * - Generarlo en el cliente con `crypto.randomUUID()` ANTES de llamar.
 * - Si la petición falla por error de red, reintentar con EL MISMO UUID.
 * - Solo generar uno nuevo cuando se quiera registrar una venta diferente.
 */
export async function crearVenta(payload: CreateVentaPayload): Promise<Venta> {
  const { data } = await api.post<Venta>('/ventas', payload);
  return data;
}

// ── Consultar ventas ─────────────────────────────────────────────────────────

/** Todas las ventas de la sede (CAJERO, ADMIN, SUPERADMIN). */
export async function listVentas(query: VentaQuery = {}): Promise<Paginated<Venta>> {
  const { data } = await api.get<Paginated<Venta>>('/ventas', {
    params: {
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
      estado: query.estado,
      vendedoraId: query.vendedoraId,
      cajaSesionId: query.cajaSesionId,
      sedeId: query.sedeId,
    },
  });
  return data;
}

/** Solo las ventas de la vendedora autenticada (VENDEDORA). */
export async function listMisVentas(query: VentaQuery = {}): Promise<Paginated<Venta>> {
  const { data } = await api.get<Paginated<Venta>>('/ventas/mias', {
    params: {
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
      estado: query.estado,
      cajaSesionId: query.cajaSesionId,
    },
  });
  return data;
}

/** Detalle completo de una venta. */
export async function getVenta(id: string): Promise<Venta> {
  const { data } = await api.get<Venta>(`/ventas/${id}`);
  return data;
}

// ── Anular venta ─────────────────────────────────────────────────────────────

/**
 * Anula una venta (solo con caja ABIERTA).
 * Requiere permiso ventas:anular (ADMIN, SUPERADMIN).
 */
export async function anularVenta(id: string, payload: AnularVentaPayload): Promise<Venta> {
  const { data } = await api.post<Venta>(`/ventas/${id}/anular`, payload);
  return data;
}

// ── Conciliar (clasificar pago) ──────────────────────────────────────────────

/**
 * Clasifica el método de pago de una venta.
 *
 * Transiciones:
 * - PENDIENTE → EFECTIVO  (ventas:conciliar)
 * - PENDIENTE → BILLETERA (ventas:conciliar) + etiquetaId obligatorio
 * - EFECTIVO  ↔ BILLETERA (ventas:conciliar-corregir + caja abierta)
 */
export async function conciliarVenta(
  id: string,
  payload: ConciliarVentaPayload,
): Promise<Venta> {
  const { data } = await api.patch<Venta>(`/ventas/${id}/conciliacion`, payload);
  return data;
}
