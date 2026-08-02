import { api } from "./client";
import type { Paginated } from "@/types/api";
import type {
  AbrirCajaPayload,
  ArqueoCajaPayload,
  CajaMovimiento,
  CajaMovimientoTipo,
  CajaSesion,
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

export async function abrirCaja(
  payload: AbrirCajaPayload,
): Promise<CajaSesion> {
  const { data } = await api.post<CajaSesion>("/caja/apertura", payload);
  return data;
}

export async function listMovimientosCaja(
  cajaId: string,
  query: { pagina?: number; limite?: number; tipo?: CajaMovimientoTipo } = {},
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

export async function cerrarCaja(
  cajaId: string,
  payload: ArqueoCajaPayload,
): Promise<CajaSesion> {
  const { data } = await api.post<CajaSesion>(
    `/caja/${cajaId}/cierre`,
    payload,
  );
  return data;
}
