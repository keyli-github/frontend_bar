/**
 * Endpoints de `UsuariosController` (`@Controller('usuarios')`).
 *
 * Todos exigen permisos `usuarios:*`. Un ADMIN solo ve/gestiona usuarios de su
 * propia sede: el filtrado por `sedeId` lo aplica el backend, no el cliente.
 */
import { api } from './client';
import type {
  CreateUsuarioPayload,
  ListUsuariosQuery,
  MessageResponse,
  Paginated,
  UpdateUsuarioPayload,
  Usuario,
  UsuarioDetalle,
} from '@/types/api';

/** `GET /usuarios` — requiere `usuarios:leer`. */
export async function listUsuarios(
  query: ListUsuariosQuery = {},
): Promise<Paginated<Usuario>> {
  const { data } = await api.get<Paginated<Usuario>>('/usuarios', {
    params: { pagina: query.pagina ?? 1, limite: query.limite ?? 25 },
  });
  return data;
}

/** `GET /usuarios/:id` — requiere `usuarios:leer`. */
export async function getUsuario(id: string): Promise<UsuarioDetalle> {
  const { data } = await api.get<UsuarioDetalle>(`/usuarios/${id}`);
  return data;
}

/** `POST /usuarios` — requiere `usuarios:crear`. */
export async function createUsuario(
  payload: CreateUsuarioPayload,
): Promise<Usuario> {
  const { data } = await api.post<Usuario>('/usuarios', payload);
  return data;
}

/** `PATCH /usuarios/:id` — requiere `usuarios:editar`. */
export async function updateUsuario(
  id: string,
  payload: UpdateUsuarioPayload,
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}`, payload);
  return data;
}

/**
 * `DELETE /usuarios/:id` — requiere `usuarios:eliminar`.
 * Es un soft-delete: marca `activo = false`, no borra la fila.
 * Revertible con `updateUsuario(id, { activo: true })`.
 *
 * El backend solo devuelve `{ id, username, activo }`, no el usuario completo.
 */
export async function deactivateUsuario(
  id: string,
): Promise<Pick<Usuario, 'id' | 'username' | 'activo'>> {
  const { data } =
    await api.delete<Pick<Usuario, 'id' | 'username' | 'activo'>>(
      `/usuarios/${id}`,
    );
  return data;
}

/**
 * `POST /usuarios/:id/resetear-password` — requiere
 * `usuarios:resetear-password`. Rate limit 3/min.
 *
 * El campo se llama `tempPassword` (usuarios.service.ts). Es la UNICA vez que
 * la contrasena viaja en claro: el backend ya guardo su hash y no hay forma de
 * recuperarla despues, asi que quien llama debe mostrarla al administrador.
 */
export async function resetPasswordUsuario(
  id: string,
): Promise<MessageResponse & { tempPassword: string }> {
  const { data } = await api.post<MessageResponse & { tempPassword: string }>(
    `/usuarios/${id}/resetear-password`,
  );
  return data;
}
