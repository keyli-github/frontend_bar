/**
 * Endpoints de `InventarioController` (`@Controller('inventario')`).
 *
 * Stock POR SEDE. Un usuario no-SUPERADMIN solo ve/toca su sede: el alcance
 * lo aplica el servidor. SUPERADMIN puede pasar `sedeId` para filtrar.
 *
 * Lectura: `inventario:leer`. Configurar min/max: `inventario:crear`.
 * Ajustar stock (escribe kardex): `inventario:editar`.
 */
import { api } from './client';
import type {
  AjusteStockPayload,
  InventarioItem,
  InventarioQuery,
  InventarioResumen,
  Paginated,
  UpsertInventarioPayload,
} from '@/types/api';

/** `GET /inventario` — stock de la sede, paginado. */
export async function listInventario(
  query: InventarioQuery = {},
): Promise<Paginated<InventarioItem>> {
  const { data } = await api.get<Paginated<InventarioItem>>('/inventario', {
    params: {
      ...query,
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
    },
  });
  return data;
}

/** `GET /inventario/resumen` — KPIs de la sede (`sedeId` solo SUPERADMIN). */
export async function getInventarioResumen(
  sedeId?: string,
): Promise<InventarioResumen> {
  const { data } = await api.get<InventarioResumen>('/inventario/resumen', {
    params: sedeId ? { sedeId } : undefined,
  });
  return data;
}

/** `POST /inventario` — configura parametros de stock (min/max/ubicacion). */
export async function upsertInventario(
  payload: UpsertInventarioPayload,
): Promise<InventarioItem> {
  const { data } = await api.post<InventarioItem>('/inventario', payload);
  return data;
}

/** `PATCH /inventario/:id/ajuste` — entrada/salida/ajuste; escribe kardex. */
export async function ajustarStock(
  id: string,
  payload: AjusteStockPayload,
): Promise<InventarioItem> {
  const { data } = await api.patch<InventarioItem>(
    `/inventario/${id}/ajuste`,
    payload,
  );
  return data;
}
