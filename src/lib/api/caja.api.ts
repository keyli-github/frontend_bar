import { api } from "./client";
import type { Paginated } from "@/types/api";
import type {
  AbrirCajaPayload,
  ArqueoCajaPayload,
  CajaDetalle,
  CajaHistorialQuery,
  CajaMovimiento,
  CajaMovimientosQuery,
  CajaSesion,
  CajaSesionHistorial,
  CierreV2Payload,
  MovimientoCajaPayload,
} from "@/types/caja";

export async function getCajaActual(
  sedeId?: string,
): Promise<CajaSesion | null> {
  const { data } = await api.get<CajaSesion | null>("/caja/actual", {
    params: sedeId ? { sedeId } : undefined,
  });
  return data;
}

export async function getCajaHistorial(
  query: CajaHistorialQuery = {},
): Promise<Paginated<CajaSesionHistorial>> {
  const { data } = await api.get<Paginated<CajaSesionHistorial>>(
    "/caja/historial",
    {
      params: {
        pagina: query.pagina ?? 1,
        limite: query.limite ?? 10,
        sedeId: query.sedeId,
        estado: query.estado,
      },
    },
  );
  return data;
}

export async function getCajaDetalle(cajaId: string): Promise<CajaDetalle> {
  const { data } = await api.get<CajaDetalle>(`/caja/${cajaId}`);
  return data;
}

export async function abrirCaja(
  payload: AbrirCajaPayload,
): Promise<CajaSesion> {
  const { data } = await api.post<CajaSesion>("/caja/apertura", payload);
  return data;
}

export async function listMovimientosCaja(
  cajaId: string,
  query: CajaMovimientosQuery = {},
): Promise<Paginated<CajaMovimiento>> {
  const { data } = await api.get<Paginated<CajaMovimiento>>(
    `/caja/${cajaId}/movimientos`,
    {
      params: {
        pagina: query.pagina ?? 1,
        limite: query.limite ?? 100,
        tipo: query.tipo,
      },
    },
  );
  return data;
}

/**
 * @deprecated Bloqueado por regla de negocio en sesiones V2 (422).
 * Solo funciona para sesiones V1 legacy (si el usuario tiene caja:movimientos).
 */
export async function registrarMovimientoCaja(
  cajaId: string,
  payload: MovimientoCajaPayload,
): Promise<CajaMovimiento> {
  const { data } = await api.post<CajaMovimiento>(
    `/caja/${cajaId}/movimientos`,
    payload,
  );
  return data;
}

export async function precuadrarCaja(
  cajaId: string,
  payload: ArqueoCajaPayload,
): Promise<CajaSesion> {
  const { data } = await api.post<CajaSesion>(
    `/caja/${cajaId}/precuadre`,
    payload,
  );
  return data;
}

/**
 * Cierre de caja V2.
 * Si hay ventas PENDIENTES sin clasificar, el backend bloquea el cierre
 * a menos que se envíe `forzarPendientes: true` + `motivoForzado`.
 */
export async function cerrarCaja(
  cajaId: string,
  payload: CierreV2Payload,
): Promise<CajaSesion> {
  const { data } = await api.post<CajaSesion>(
    `/caja/${cajaId}/cierre`,
    payload,
  );
  return data;
}
