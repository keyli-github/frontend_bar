/**
 * Contrato con la API NestJS (`backend_bar`).
 *
 * Estos tipos son un espejo manual de los DTOs / selects de Prisma del backend.
 * Si tocas un `select` en un `*.service.ts`, actualiza el tipo correspondiente
 * aqui. Las fechas viajan como ISO string (JSON), no como Date.
 */

// ============================================================
// AUTH
// ============================================================

/** `src/modules/auth/interfaces/auth-response.interface.ts` */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  /** Vida del accessToken en segundos. */
  expiresIn: number;
  mustChangePassword: boolean;
}

/** `LoginDto` — ojo: el backend autentica por `username`, no por email. */
export interface LoginPayload {
  username: string;
  password: string;
}

/** `ChangePasswordDto` — minimo 12 chars, mayuscula + minuscula + numero. */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Respuesta de `GET /auth/perfil` (AuthService.getPerfil). */
export interface Perfil {
  id: string;
  username: string;
  /** Nombre del rol: SUPERADMIN, ADMIN, CAJERO, MOZO, COCINA, BARTENDER. */
  rol: string;
  /** Jerarquia: SUPERADMIN=100, ADMIN=50, empleados=10. */
  nivel: number;
  sedeId: string | null;
  /** Nombre legible de la sede, o null para SUPERADMIN global. */
  sede: string | null;
  createdAt: string;
}

/** Respuesta de `GET /auth/sesiones` (dispositivos conectados). */
export interface SessionInfo {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  ip: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  /** true si es la sesion desde la que se hace la consulta. */
  actual: boolean;
}

/** Endpoints que solo confirman la accion. */
export interface MessageResponse {
  message: string;
}

// ============================================================
// PAGINACION
// ============================================================

/** Envoltorio usado por `GET /usuarios` y `GET /audit`. */
export interface Paginated<T> {
  data: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface PaginationQuery {
  pagina?: number;
  limite?: number;
}

// ============================================================
// USUARIOS
// ============================================================

export interface UsuarioRolRef {
  id: string;
  nombre: string;
  nivel: number;
}

export interface SedeRef {
  id: string;
  nombre: string;
}

/** Item de `GET /usuarios`. */
export interface Usuario {
  id: string;
  username: string;
  activo: boolean;
  rol: UsuarioRolRef;
  sede: SedeRef | null;
  createdAt: string;
}

/** `GET /usuarios/:id` anade el flag de cambio de password forzado. */
export interface UsuarioDetalle extends Usuario {
  mustChangePassword: boolean;
}

/** `CreateUsuarioDto`. `sedeId` es obligatorio salvo para SUPERADMIN. */
export interface CreateUsuarioPayload {
  username: string;
  password: string;
  rolId: string;
  sedeId?: string;
}

/** `UpdateUsuarioDto` — todos los campos opcionales. */
export interface UpdateUsuarioPayload {
  rolId?: string;
  sedeId?: string;
  /** Reactivar un usuario dado de baja con `DELETE /usuarios/:id`. */
  activo?: boolean;
}

/** `ListUsuariosQueryDto` — limite maximo 100. */
export type ListUsuariosQuery = PaginationQuery;

export interface ListPermisosQuery extends PaginationQuery {
  modulo?: string;
}

// ============================================================
// ROLES
// ============================================================

export interface PermisoRef {
  id: string;
  nombre: string;
  modulo: string;
}

/** Campos que devuelve `POST /roles` y `PATCH /roles/:id`. */
export interface RolBase {
  id: string;
  nombre: string;
  descripcion: string | null;
  nivel: number;
  activo: boolean;
  createdAt: string;
}

/**
 * Forma completa de `GET /roles`, `GET /roles/:id` y
 * `PUT /roles/:id/permisos`, que ademas incluyen permisos y conteos.
 * Las mutaciones de alta/edicion NO los traen (ver `RolBase`).
 */
export interface Rol extends RolBase {
  permisos: { permiso: PermisoRef }[];
  _count: { usuarios: number };
  updatedAt: string;
}

/** `CreateRolDto` — nivel entre 1 y 99 (0 y 100 estan reservados). */
export interface CreateRolPayload {
  nombre: string;
  descripcion?: string;
  nivel: number;
}

export interface UpdateRolPayload {
  descripcion?: string;
  nivel?: number;
  activo?: boolean;
}

/** `AssignPermisosDto` — reemplaza TODOS los permisos del rol. */
export interface AssignPermisosPayload {
  permisoIds: string[];
}

// ============================================================
// PERMISOS
// ============================================================

/** Campos que devuelve `POST /permisos` y `PATCH /permisos/:id`. */
export interface PermisoBase {
  id: string;
  nombre: string;
  modulo: string;
  descripcion: string | null;
}

/** `GET /permisos` anade cuantos roles lo tienen asignado. */
export interface Permiso extends PermisoBase {
  _count: { roles: number };
}

/** `GET /permisos/agrupados` — clave = modulo. */
export type PermisosAgrupados = Record<string, Permiso[]>;

// ============================================================
// ESTABLECIMIENTOS (SEDES)
// ============================================================

export interface Establecimiento {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  /** RUC peruano: 11 digitos. */
  ruc: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { usuarios: number };
}

export interface CreateEstablecimientoPayload {
  nombre: string;
  direccion?: string;
  telefono?: string;
  ruc?: string;
}

export interface UpdateEstablecimientoPayload {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  ruc?: string;
  activo?: boolean;
}

// ============================================================
// AUDITORIA
// ============================================================

export interface AuditLog {
  id: string;
  usuarioId: string | null;
  usuario: { id: string; username: string } | null;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  detalle: unknown;
  ip: string | null;
  userAgent: string | null;
  sedeId: string | null;
  createdAt: string;
}

/** `AuditQueryDto` — `desde`/`hasta` en formato ISO date. */
export interface AuditQuery {
  accion?: string;
  usuarioId?: string;
  entidad?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  limite?: number;
}
