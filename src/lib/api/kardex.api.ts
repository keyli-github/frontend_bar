/**
 * Endpoint de `KardexController` (`@Controller('kardex')`).
 *
 * Historico de movimientos de stock. SOLO LECTURA: las escrituras las hace
 * `inventario` (ajustes) y `compras` (recepciones). Alcance por sede en el
 * servidor; SUPERADMIN puede pasar `sedeId`.
 *
 * Lectura: `kardex:leer`.
 */
import { api } from './client';
import type {
  KardexMovimiento,
  KardexQuery,
  KardexResumen,
  Paginated,
} from '@/types/api';

/** `GET /kardex` — movimientos paginados, mas recientes primero. */
export async function listKardex(
  query: KardexQuery = {},
): Promise<Paginated<KardexMovimiento>> {
  const { data } = await api.get<Paginated<KardexMovimiento>>('/kardex', {
    params: {
      ...query,
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
    },
  });
  return data;
}

/** `GET /kardex/resumen` — KPIs del histórico filtrado. */
export async function getKardexResumen(
  query: Omit<KardexQuery, 'pagina' | 'limite'> = {},
): Promise<KardexResumen> {
  const { data } = await api.get<KardexResumen>('/kardex/resumen', {
    params: query,
  });
  return data;
}
