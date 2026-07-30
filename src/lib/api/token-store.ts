/**
 * Almacen de tokens.
 *
 * Estrategia (decidida en el analisis de conexion front<->back):
 *   - accessToken  -> SOLO en memoria. Muere al recargar la pestana, por lo que
 *                     no queda expuesto a XSS ni a extensiones que leen storage.
 *   - refreshToken -> localStorage. Es lo unico que persiste; al arrancar la app
 *                     se canjea por un accessToken nuevo (ver bootstrap()).
 *
 * El backend rota el refreshToken en cada uso y detecta reuso revocando toda la
 * familia (auth.service.ts), asi que persistirlo tiene un coste acotado.
 */

const REFRESH_KEY = 'barbeer.refreshToken';

/** Vive solo en memoria: nunca se serializa. */
let accessToken: string | null = null;

/** Momento (epoch ms) en el que el accessToken deja de ser valido. */
let accessTokenExpiresAt = 0;

/** Suscriptores notificados cuando la sesion se invalida por completo. */
const sessionEndedListeners = new Set<() => void>();

const isBrowser = (): boolean => typeof window !== 'undefined';

// ============================================================
// ACCESS TOKEN (memoria)
// ============================================================

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * @param token     JWT devuelto por el backend.
 * @param expiresIn Segundos de vida (campo `expiresIn` de AuthResponse).
 */
export function setAccessToken(token: string, expiresIn: number): void {
  accessToken = token;
  accessTokenExpiresAt = Date.now() + expiresIn * 1000;
}

/**
 * Margen de 10s para no enviar un token que caduca en pleno vuelo.
 */
export function isAccessTokenExpired(): boolean {
  if (!accessToken) return true;
  return Date.now() >= accessTokenExpiresAt - 10_000;
}

// ============================================================
// REFRESH TOKEN (localStorage o sessionStorage)
// ============================================================

/**
 * Donde vive el refresh token, segun la casilla "Recordarme" del login:
 *   - localStorage   -> la sesion sobrevive al cierre del navegador.
 *   - sessionStorage -> muere al cerrar la pestana.
 *
 * Se lee de ambos al arrancar porque el usuario pudo elegir cualquiera.
 */
function storages(): Storage[] {
  if (!isBrowser()) return [];
  try {
    return [window.localStorage, window.sessionStorage];
  } catch {
    return [];
  }
}

export function getRefreshToken(): string | null {
  for (const store of storages()) {
    try {
      const value = store.getItem(REFRESH_KEY);
      if (value) return value;
    } catch {
      /* storage bloqueado: se prueba el siguiente */
    }
  }
  return null;
}

/**
 * @param remember `true` -> localStorage; `false` -> sessionStorage.
 *   Si se omite, se conserva el almacen que ya estuviera en uso, para que un
 *   refresh rotativo no cambie la decision tomada en el login.
 */
export function setRefreshToken(token: string, remember?: boolean): void {
  if (!isBrowser()) return;

  const persist =
    remember ?? (window.localStorage.getItem(REFRESH_KEY) !== null);

  try {
    const target = persist ? window.localStorage : window.sessionStorage;
    const other = persist ? window.sessionStorage : window.localStorage;
    other.removeItem(REFRESH_KEY);
    target.setItem(REFRESH_KEY, token);
  } catch {
    /* noop */
  }
}

// ============================================================
// CICLO DE VIDA
// ============================================================

/**
 * Guarda el par completo tras un login o un refresh exitoso.
 * @param remember Solo se pasa en el login; en los refresh se omite para
 *   respetar la eleccion original del usuario.
 */
export function setTokens(
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  },
  remember?: boolean,
): void {
  setAccessToken(tokens.accessToken, tokens.expiresIn);
  setRefreshToken(tokens.refreshToken, remember);
}

/** Borra todo rastro de sesion, en ambos almacenes. */
export function clearTokens(): void {
  accessToken = null;
  accessTokenExpiresAt = 0;
  for (const store of storages()) {
    try {
      store.removeItem(REFRESH_KEY);
    } catch {
      /* noop */
    }
  }
}

/**
 * Notifica que la sesion termino de forma irrecuperable (refresh invalido,
 * reuso detectado, usuario desactivado). Lo consume el auth-store para limpiar
 * su estado y redirigir a /login sin acoplar el cliente HTTP a React.
 */
export function onSessionEnded(listener: () => void): () => void {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

export function emitSessionEnded(): void {
  clearTokens();
  sessionEndedListeners.forEach((listener) => listener());
}
