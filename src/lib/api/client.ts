/**
 * Cliente HTTP unico contra la API NestJS.
 *
 * Responsabilidades:
 *   1. Inyectar el Bearer token en cada peticion.
 *   2. Renovar el accessToken de forma transparente ante un 401 (single-flight:
 *      N peticiones simultaneas disparan UN solo refresh).
 *   3. Normalizar los errores del backend a una `ApiError` con mensaje legible.
 *
 * El backend expone todo bajo el prefijo `/api` (app.setup.ts -> setGlobalPrefix).
 */
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  emitSessionEnded,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './token-store';

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://hia-server.tail99b0ec.ts.net/backend-bar/api'
    : 'http://localhost:3001/api';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

/**
 * Rutas publicas: no llevan Authorization ni disparan refresh.
 *
 * La comparacion es EXACTA a proposito. Con `startsWith`, `/auth/logout-all`
 * casaba con `/auth/logout` y se quedaba sin cabecera Authorization, asi que
 * el endpoint (que si exige JWT) respondia 401 siempre.
 */
const PUBLIC_PATHS = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

const isPublicPath = (url?: string): boolean => {
  if (!url) return false;
  // Descarta querystring antes de comparar.
  const path = url.split('?')[0];
  return PUBLIC_PATHS.has(path);
};

// ============================================================
// ERROR NORMALIZADO
// ============================================================

/** Forma del body de error que produce AllExceptionsFilter en el backend. */
interface BackendErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  path?: string;
}

export class ApiError extends Error {
  readonly status: number;
  /** Errores de validacion de class-validator, uno por campo incumplido. */
  readonly details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<BackendErrorBody>;

    if (!axiosError.response) {
      return new ApiError(
        'No se pudo conectar con el servidor. Verifica tu conexion.',
        0,
      );
    }

    const { status, data } = axiosError.response;
    const raw = data?.message;
    // ValidationPipe devuelve un array de mensajes; el resto, un string.
    const details = Array.isArray(raw) ? raw : [];
    const message =
      details[0] ??
      (typeof raw === 'string' ? raw : undefined) ??
      data?.error ??
      'Ocurrio un error inesperado';

    return new ApiError(message, status, details);
  }

  return new ApiError('Ocurrio un error inesperado', 0);
}

// ============================================================
// INSTANCIAS
// ============================================================

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Instancia desnuda para el refresh. Usar `api` aqui provocaria recursion
 * infinita: un 401 del propio refresh volveria a disparar el interceptor.
 */
const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// REQUEST: Bearer + metadatos de dispositivo
// ============================================================

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers);

  if (!isPublicPath(config.url)) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  config.headers = headers;
  return config;
});

/**
 * El backend lee `x-device-name`/`x-device-type` para etiquetar las sesiones
 * (auth.controller.ts -> extractDeviceInfo). Se envian solo en login/refresh.
 */
export function deviceHeaders(): Record<string, string> {
  return { 'x-device-type': 'web' };
}

// ============================================================
// RESPONSE: refresh transparente ante 401 (single-flight)
// ============================================================

/** Promesa del refresh en vuelo; null si no hay ninguno. */
let refreshInFlight: Promise<string> | null = null;

/**
 * Error que significa "la sesion esta muerta y no se puede recuperar":
 * el servidor RECHAZO el refresh token (invalido, revocado o reusado).
 *
 * Se distingue de "no pude preguntar" (sin red, timeout, 5xx, o 429 del
 * throttler). Confundirlos borraba el refresh token del disco ante un simple
 * corte de red, dejando al usuario fuera de forma permanente.
 */
class SessionDeadError extends Error {}

/**
 * Serializa el refresh entre PESTANAS, no solo dentro de una.
 *
 * El refresh token se comparte via storage, pero el single-flight en memoria
 * es por pestana. Con dos pestanas abiertas, ambas hacian POST /auth/refresh
 * con el mismo token; el backend interpreta el segundo como REUSO y revoca la
 * familia entera (auth.service.ts -> handleTokenReuse), expulsando a las dos y
 * generando una alerta de seguridad falsa.
 *
 * `navigator.locks` coordina entre pestanas del mismo origen. Donde no exista,
 * se degrada a ejecucion directa (el comportamiento anterior).
 */
function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('barbeer.token-refresh', fn) as Promise<T>;
  }
  return fn();
}

async function refreshAccessToken(): Promise<string> {
  const tokenAlEntrar = getRefreshToken();

  return withCrossTabLock(async () => {
    // Dentro del lock se relee: otra pestana pudo haber rotado el token
    // mientras esperabamos. Usar el valor viejo dispararia deteccion de reuso.
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new SessionDeadError('Sin refresh token');

    if (tokenAlEntrar && refreshToken !== tokenAlEntrar) {
      // Otra pestana ya renovo. No hace falta gastar otro uso del token.
      const vigente = getAccessToken();
      if (vigente) return vigente;
    }

    try {
      const { data } = await refreshClient.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        mustChangePassword: boolean;
      }>('/auth/refresh', { refreshToken }, { headers: deviceHeaders() });

      setTokens(data);
      return data.accessToken;
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;

      // 401/403 -> el servidor rechazo el token: sesion irrecuperable.
      if (status === 401 || status === 403) {
        throw new SessionDeadError('Refresh token rechazado');
      }

      // Cualquier otra cosa (sin red, 429, 5xx) es transitoria: se propaga el
      // fallo SIN tocar el refresh token, para poder reintentar mas tarde.
      throw toApiError(error);
    }
  });
}

/** Devuelve la promesa compartida, creandola solo si no hay refresh activo. */
function getRefreshPromise(): Promise<string> {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(toApiError(error));
    }

    const config = error.config as RetriableConfig;
    const status = error.response?.status;

    if (status !== 401 || isPublicPath(config.url)) {
      return Promise.reject(toApiError(error));
    }

    // Segundo 401 tras haber renovado: el access token es nuevo y aun asi el
    // servidor lo rechaza (familia revocada desde otro dispositivo, usuario
    // desactivado...). Sin esto, el store se quedaba en 'authenticated' con
    // una sesion inservible y la app fallaba en bucle sin volver al login.
    if (config._retried) {
      emitSessionEnded();
      return Promise.reject(new ApiError('Sesión expirada', 401));
    }

    config._retried = true;

    let token: string;
    try {
      token = await getRefreshPromise();
    } catch (refreshError) {
      if (refreshError instanceof SessionDeadError) {
        // El servidor rechazo el refresh token: no hay vuelta atras.
        emitSessionEnded();
        return Promise.reject(new ApiError('Sesión expirada', 401));
      }
      // Fallo transitorio: se conserva el refresh token para reintentar.
      return Promise.reject(toApiError(refreshError));
    }

    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : new AxiosHeaders(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;

    // El reintento propaga su propio error ya normalizado por este interceptor.
    return api.request(config);
  },
);

/** `true` si el fallo del refresh significa sesion irrecuperable. */
export function isSessionDead(error: unknown): boolean {
  return error instanceof SessionDeadError;
}

/** Fuerza un refresh manual. Lo usa el bootstrap de sesion al cargar la app. */
export function forceRefresh(): Promise<string> {
  return getRefreshPromise();
}

export { toApiError };
