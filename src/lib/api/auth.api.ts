/** Endpoints de `AuthController` (`@Controller('auth')`). */
import { api, deviceHeaders } from './client';
import type {
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  MessageResponse,
  Perfil,
  SessionInfo,
} from '@/types/api';

/** `POST /auth/login` — publico, rate limit 5/min. */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload, {
    headers: deviceHeaders(),
  });
  return data;
}

/**
 * `POST /auth/logout` — publico, invalida la familia del refresh token.
 * No lanza si falla: cerrar sesion en el cliente nunca debe quedar bloqueado
 * por un error de red.
 */
export async function logout(refreshToken: string): Promise<void> {
  try {
    await api.post<MessageResponse>('/auth/logout', { refreshToken });
  } catch {
    /* noop */
  }
}

/** `POST /auth/logout-all` — cierra todas las sesiones del usuario. */
export async function logoutAll(): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>('/auth/logout-all');
  return data;
}

/** `PATCH /auth/cambiar-password` — tras exito, el backend exige re-login. */
export async function cambiarPassword(
  payload: ChangePasswordPayload,
): Promise<MessageResponse> {
  const { data } = await api.patch<MessageResponse>(
    '/auth/cambiar-password',
    payload,
  );
  return data;
}

/** `GET /auth/perfil` — datos del usuario autenticado. */
export async function getPerfil(): Promise<Perfil> {
  const { data } = await api.get<Perfil>('/auth/perfil');
  return data;
}

/** `GET /auth/sesiones` — dispositivos con sesion activa. */
export async function getSesiones(): Promise<SessionInfo[]> {
  const { data } = await api.get<SessionInfo[]>('/auth/sesiones');
  return data;
}

/** `DELETE /auth/sesiones/:id` — cierra un dispositivo concreto. */
export async function cerrarSesion(
  sessionId: string,
): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(
    `/auth/sesiones/${sessionId}`,
  );
  return data;
}

/** `DELETE /auth/sesiones` — cierra todas menos la actual. */
export async function cerrarOtrasSesiones(): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>('/auth/sesiones');
  return data;
}
