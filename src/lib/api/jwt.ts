/**
 * Decodificacion del access token.
 *
 * IMPORTANTE: aqui NO se verifica la firma y no debe hacerse. El payload se lee
 * solo para pintar la UI (rol, permisos, sede). Toda decision de seguridad la
 * toma el backend, que si valida la firma en cada peticion.
 */

/** Espejo de `src/common/interfaces/jwt-payload.interface.ts`. */
export interface JwtPayload {
  sub: string;
  username: string;
  rol: string;
  nivel: number;
  sedeId: string | null;
  permisos: string[];
  /** Id de la familia de refresh tokens = identificador de sesion. */
  sid: string;
  mustChangePassword: boolean;
  iat?: number;
  exp?: number;
}

/** base64url -> string UTF-8. */
function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Devuelve el payload, o null si el token esta malformado. */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    return null;
  }
}
