/**
 * Endpoints de `PermisosController` (`@Controller('permisos')`).
 *
 * Lectura: permiso `permisos:leer`. Escritura: rol SUPERADMIN.
 */
import { api } from './client';
import type {
  ListPermisosQuery,
  Paginated,
  Permiso,
  PermisosAgrupados,
} from '@/types/api';

/** `GET /permisos` — paginado, con filtro opcional por modulo. */
export async function listPermisos(
  query: ListPermisosQuery = {},
): Promise<Paginated<Permiso>> {
  const { data } = await api.get<Paginated<Permiso>>('/permisos', {
    params: {
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
      ...(query.modulo ? { modulo: query.modulo } : {}),
    },
  });
  return data;
}

/** `GET /permisos/agrupados` — util para construir el selector de permisos. */
export async function listPermisosAgrupados(): Promise<PermisosAgrupados> {
  const { data } = await api.get<PermisosAgrupados>('/permisos/agrupados');
  return data;
}
