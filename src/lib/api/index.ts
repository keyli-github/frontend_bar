/** Punto de entrada unico de la capa API. */
export { api, ApiError, API_BASE_URL, forceRefresh, isSessionDead } from './client';
export {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  onSessionEnded,
  setTokens,
} from './token-store';

export * as authApi from './auth.api';
export * as usuariosApi from './usuarios.api';
export * as rolesApi from './roles.api';
export * as permisosApi from './permisos.api';
export * as establecimientosApi from './establecimientos.api';
export * as asistenciaApi from './asistencia.api';
export * as auditApi from './audit.api';
export * as productosApi from './productos.api';
export * as inventarioApi from './inventario.api';
export * as kardexApi from './kardex.api';
export * as comprasApi from './compras.api';
