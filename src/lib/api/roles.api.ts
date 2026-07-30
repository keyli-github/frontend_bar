/**
 * Endpoints de `RolesController` (`@Controller('roles')`).
 *
 * Lectura: permiso `roles:leer`. Escritura: rol SUPERADMIN.
 */
import { api } from './client';
import type {
  AssignPermisosPayload,
  CreateRolPayload,
  MessageResponse,
  Paginated,
  PaginationQuery,
  Rol,
  RolBase,
  UpdateRolPayload,
} from '@/types/api';

/** `GET /roles` — paginado, limite maximo 100. */
export async function listRoles(
  query: PaginationQuery = {},
): Promise<Paginated<Rol>> {
  const { data } = await api.get<Paginated<Rol>>('/roles', {
    params: { pagina: query.pagina ?? 1, limite: query.limite ?? 25 },
  });
  return data;
}

/** `GET /roles/:id` */
export async function getRol(id: string): Promise<Rol> {
  const { data } = await api.get<Rol>(`/roles/${id}`);
  return data;
}

/**
 * `POST /roles` — solo SUPERADMIN.
 * Devuelve `RolBase`: el select del backend no incluye `permisos` ni `_count`.
 */
export async function createRol(payload: CreateRolPayload): Promise<RolBase> {
  const { data } = await api.post<RolBase>('/roles', payload);
  return data;
}

/** `PATCH /roles/:id` — solo SUPERADMIN. El nombre no es editable. */
export async function updateRol(
  id: string,
  payload: UpdateRolPayload,
): Promise<RolBase> {
  const { data } = await api.patch<RolBase>(`/roles/${id}`, payload);
  return data;
}

/**
 * `DELETE /roles/:id` — solo SUPERADMIN. Los roles del sistema estan
 * protegidos. El backend responde `{ message }`, no la entidad.
 */
export async function deleteRol(id: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/roles/${id}`);
  return data;
}

/**
 * `PUT /roles/:id/permisos` — solo SUPERADMIN.
 * Semantica de reemplazo total: lo que no venga en `permisoIds` se elimina.
 */
export async function assignPermisos(
  id: string,
  payload: AssignPermisosPayload,
): Promise<Rol> {
  const { data } = await api.put<Rol>(`/roles/${id}/permisos`, payload);
  return data;
}
