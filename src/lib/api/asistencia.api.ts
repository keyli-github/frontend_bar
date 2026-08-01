/**
 * Endpoints de `AsistenciaController` (`@Controller('asistencia')`).
 *
 * Lectura: permiso `asistencia:leer`. Alta: `asistencia:crear`.
 * Edicion: `asistencia:editar`. Borrado: `asistencia:eliminar`.
 *
 * La asistencia solo aplica a empleados (rol nivel < ADMIN). Un usuario
 * no-SUPERADMIN solo ve/toca su sede: el alcance lo aplica el servidor.
 */
import { api } from './client';
import type {
  Asistencia,
  AsistenciaPlanilla,
  AsistenciaQuery,
  AsistenciaResumen,
  CreateAsistenciaPayload,
  MessageResponse,
  Paginated,
  UpdateAsistenciaPayload,
} from '@/types/api';

/** `GET /asistencia` — planilla del dia, paginada (limite maximo 100). */
export async function listAsistencia(
  query: AsistenciaQuery = {},
): Promise<Paginated<AsistenciaPlanilla>> {
  const { data } = await api.get<Paginated<AsistenciaPlanilla>>('/asistencia', {
    params: {
      ...query,
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
    },
  });
  return data;
}

/** `GET /asistencia/resumen` — KPIs del dia (`fecha` por defecto hoy). */
export async function getAsistenciaResumen(
  fecha?: string,
): Promise<AsistenciaResumen> {
  const { data } = await api.get<AsistenciaResumen>('/asistencia/resumen', {
    params: fecha ? { fecha } : undefined,
  });
  return data;
}

/** `POST /asistencia` — registra o reemplaza la jornada de un empleado. */
export async function createAsistencia(
  payload: CreateAsistenciaPayload,
): Promise<Asistencia> {
  const { data } = await api.post<Asistencia>('/asistencia', payload);
  return data;
}

/** `PATCH /asistencia/:id` */
export async function updateAsistencia(
  id: string,
  payload: UpdateAsistenciaPayload,
): Promise<Asistencia> {
  const { data } = await api.patch<Asistencia>(`/asistencia/${id}`, payload);
  return data;
}

/** `DELETE /asistencia/:id` */
export async function deleteAsistencia(id: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/asistencia/${id}`);
  return data;
}
