/**
 * Endpoints de `EstablecimientosController` (`@Controller('establecimientos')`).
 *
 * Lectura: permiso `establecimientos:leer`. Alta: `establecimientos:crear`.
 * Edicion y borrado: `establecimientos:editar` (en la practica, SUPERADMIN).
 *
 * Un usuario no-SUPERADMIN solo recibe su propia sede: el alcance lo aplica
 * el servidor.
 */
import { api } from './client';
import type {
  CreateEstablecimientoPayload,
  Establecimiento,
  MessageResponse,
  Paginated,
  PaginationQuery,
  UpdateEstablecimientoPayload,
} from '@/types/api';

/** `GET /establecimientos` — paginado, limite maximo 100. */
export async function listEstablecimientos(
  query: PaginationQuery = {},
): Promise<Paginated<Establecimiento>> {
  const { data } = await api.get<Paginated<Establecimiento>>(
    '/establecimientos',
    { params: { pagina: query.pagina ?? 1, limite: query.limite ?? 25 } },
  );
  return data;
}

/** `GET /establecimientos/:id` */
export async function getEstablecimiento(id: string): Promise<Establecimiento> {
  const { data } = await api.get<Establecimiento>(`/establecimientos/${id}`);
  return data;
}

/** `POST /establecimientos` */
export async function createEstablecimiento(
  payload: CreateEstablecimientoPayload,
): Promise<Establecimiento> {
  const { data } = await api.post<Establecimiento>('/establecimientos', payload);
  return data;
}

/** `PATCH /establecimientos/:id` */
export async function updateEstablecimiento(
  id: string,
  payload: UpdateEstablecimientoPayload,
): Promise<Establecimiento> {
  const { data } = await api.patch<Establecimiento>(
    `/establecimientos/${id}`,
    payload,
  );
  return data;
}

/**
 * `DELETE /establecimientos/:id` — borrado real.
 * El backend responde 400 si la sede tiene usuarios asignados.
 */
export async function deleteEstablecimiento(
  id: string,
): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/establecimientos/${id}`);
  return data;
}
