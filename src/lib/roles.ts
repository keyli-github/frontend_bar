/**
 * Autorizacion en cliente.
 *
 * FUENTE DE VERDAD: el backend. Este modulo solo decide que se PINTA; quien
 * decide que se PUEDE HACER es el `PermissionsGuard`/`RolesGuard` de NestJS.
 * Ocultar un boton aqui no protege nada — es unicamente ergonomia de UI.
 *
 * Los permisos llegan en el payload del JWT (`permisos: string[]`, formato
 * `modulo:accion`) y los siembra `prisma/seed.ts`.
 */

// ============================================================
// ROLES (espejo de ROLES en src/common/constants/roles.constants.ts)
// ============================================================

export const USER_ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "CAJERO",
  "VENDEDORA",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export const roleLabel: Record<UserRole, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Administrador",
  CAJERO: "Cajero",
  VENDEDORA: "Vendedora",
};

/** Etiqueta legible para roles activos y roles personalizados. */
export const getRoleLabel = (role: string): string =>
  isUserRole(role) ? roleLabel[role] : role;

export const roleBadgeClass: Record<UserRole, string> = {
  SUPERADMIN: "bg-special/10 border-special/25 text-special",
  ADMIN: "bg-primary/10 border-primary/25 text-primary-text",
  CAJERO: "bg-success/10 border-success/25 text-success",
  VENDEDORA: "bg-amber-500/10 border-amber-500/25 text-amber-500",
};

/** Color del avatar por rol, usado en tablas y cabeceras. */
export const roleAvatarClass: Record<UserRole, string> = {
  SUPERADMIN: "bg-special",
  ADMIN: "bg-primary",
  CAJERO: "bg-success",
  VENDEDORA: "bg-amber-500",
};

// ============================================================
// PERMISOS
// ============================================================

/** Permiso granular en formato `modulo:accion` (ej. `ventas:crear`). */
export type Permission = string;

/**
 * SUPERADMIN recibe todos los permisos en el seed, asi que no necesita un
 * bypass especial. Se mantiene el chequeo por si un despliegue tuviera el
 * catalogo de permisos incompleto.
 */
export function hasPermission(
  permisos: readonly Permission[],
  required: Permission,
): boolean {
  return permisos.includes(required);
}

export function hasAnyPermission(
  permisos: readonly Permission[],
  required: readonly Permission[],
): boolean {
  return required.some((p) => permisos.includes(p));
}

// ============================================================
// ACCESO A RUTAS
// ============================================================

/**
 * Permiso exigido para entrar en cada ruta.
 *
 * `null` = ruta abierta a cualquier usuario autenticado.
 *
 * Las pantallas respaldadas por API usan exactamente el permiso sembrado por
 * el backend. La autorizacion definitiva siempre vuelve a ejecutarse en NestJS.
 */
export const ROUTE_PERMISSIONS: Record<string, Permission | null> = {
  "/dashboard": null,
  "/perfil": null,
  "/seguridad": null,
  "/caja": "caja:leer",
  "/ventas": "ventas:crear",          // VENDEDORA: crear ventas
  "/ventas/historial": "ventas:leer", // CAJERO/ADMIN: ver historial + conciliar
  "/etiquetas": "etiquetas:crear",    // ADMIN/SUPERADMIN: gestionar billeteras
  "/categorias": "categorias:leer",
  "/productos": "productos:leer",
  "/inventario": "inventario:leer",
  "/kardex": "kardex:leer",
  "/compras": "compras:leer",
  "/asistencia": "asistencia:leer",
  "/usuarios": "usuarios:leer",
  "/sucursales": "establecimientos:leer",
  "/roles": "roles:leer",
  "/permisos": "permisos:leer",
  "/auditoria": "audit:leer",
};

/** ¿Puede el usuario ver esta ruta en la navegacion y entrar en ella? */
export function canAccess(
  permisos: readonly Permission[],
  href: string,
): boolean {
  const required = ROUTE_PERMISSIONS[href];
  if (required === null) return true;
  // Ruta no declarada: por defecto se oculta, para no filtrar pantallas nuevas.
  if (required === undefined) return false;
  return hasPermission(permisos, required);
}

// ============================================================
// ACCIONES CRUD
// ============================================================

export type CrudAction = "create" | "edit" | "delete";

/** Traduccion de la accion de UI al verbo que usa el backend. */
const ACTION_VERB: Record<CrudAction, string> = {
  create: "crear",
  edit: "editar",
  delete: "eliminar",
};

/**
 * Modulo de UI -> modulo de permisos del backend.
 *
 * `sucursales` es un caso especial: el catalogo de `prisma/seed.ts` solo
 * define `establecimientos:leer|crear|editar`, NO `:eliminar`. El
 * `EstablecimientosController` protege el DELETE con `establecimientos:editar`,
 * asi que `can(p, 'sucursales', 'delete')` se remapea a ese permiso; de lo
 * contrario devolveria `false` incluso para un SUPERADMIN.
 */
const MODULE_SCOPE = {
  usuarios: "usuarios",
  roles: "roles",
  permisos: "permisos",
  sucursales: "establecimientos",
  asistencia: "asistencia",
} as const;

/** Permisos que el backend no define y hay que remapear al que si existe. */
const PERMISSION_ALIASES: Record<string, Permission> = {
  "establecimientos:eliminar": "establecimientos:editar",
};

export type UiModule = keyof typeof MODULE_SCOPE;

/**
 * ¿Puede el usuario ejecutar esta accion?
 *
 * @example can(permisos, 'productos', 'create') -> busca `productos:crear`
 */
export function can(
  permisos: readonly Permission[],
  module: UiModule,
  action: CrudAction,
): boolean {
  const required = `${MODULE_SCOPE[module]}:${ACTION_VERB[action]}`;
  return hasPermission(permisos, PERMISSION_ALIASES[required] ?? required);
}
