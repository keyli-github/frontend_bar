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
  /** Nombre del rol activo: SUPERADMIN, ADMIN, CAJERO, VENDEDORA. */
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

/** Campos base del catalogo de permisos de solo lectura. */
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
  /**
   * Código corto de 2–5 caracteres en MAYÚSCULA (A-Z, 0-9).
   * Requerido para generar códigos de venta (V-{codigoSede}-{YYYY}-{NNNN}).
   * null si aún no ha sido configurado.
   */
  codigoSede: string | null;
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
  /** Código corto único (2-5 caracteres A-Z, 0-9). Requerido para módulo de ventas. */
  codigoSede?: string;
  direccion?: string;
  telefono?: string;
  ruc?: string;
}

export interface UpdateEstablecimientoPayload {
  nombre?: string;
  /**
   * Código corto estable. Advertencia: cambiarlo altera la serie de códigos de venta.
   * Formato: 2-5 caracteres en MAYÚSCULA (A-Z, 0-9).
   */
  codigoSede?: string;
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

// ============================================================
// ASISTENCIA
// ============================================================

/** Estados de una jornada. AUSENTE es implicito cuando no hay registro. */
export type AsistenciaEstado =
  "PRESENTE" | "TARDANZA" | "AUSENTE" | "DIA_LIBRE";

/**
 * Fila de la planilla (`GET /asistencia`): un empleado + su jornada del dia.
 * `asistenciaId` es null cuando el empleado no tiene registro (AUSENTE).
 * Las horas viajan como ISO date-time string; `fecha` como ISO date.
 */
export interface AsistenciaPlanilla {
  usuarioId: string;
  username: string;
  rol: string;
  sede: SedeRef | null;
  fecha: string;
  asistenciaId: string | null;
  estado: AsistenciaEstado;
  turno: string | null;
  horaEntrada: string | null;
  horaSalida: string | null;
  horasTrabajadas: number | null;
  notas: string | null;
}

/** Jornada devuelta por `POST`/`PATCH /asistencia` (fila cruda). */
export interface Asistencia {
  id: string;
  usuarioId: string;
  sedeId: string | null;
  fecha: string;
  estado: AsistenciaEstado;
  turno: string | null;
  horaEntrada: string | null;
  horaSalida: string | null;
  horasTrabajadas: number | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /asistencia/resumen` — KPIs del dia, consistentes con la planilla. */
export interface AsistenciaResumen {
  fecha: string;
  totalEmpleados: number;
  presente: number;
  tardanza: number;
  diaLibre: number;
  ausente: number;
}

/** `AsistenciaQueryDto` — `fecha` ISO date (por defecto hoy). */
export interface AsistenciaQuery extends PaginationQuery {
  fecha?: string;
  usuarioId?: string;
}

/** `CreateAsistenciaDto`. La sede se toma del empleado en el servidor. */
export interface CreateAsistenciaPayload {
  usuarioId: string;
  fecha?: string;
  estado?: AsistenciaEstado;
  turno?: string;
  horaEntrada?: string;
  horaSalida?: string;
  notas?: string;
}

/** `UpdateAsistenciaDto` — todos opcionales; usuario/fecha no se editan. */
export interface UpdateAsistenciaPayload {
  estado?: AsistenciaEstado;
  turno?: string;
  horaEntrada?: string;
  horaSalida?: string;
  notas?: string;
}

// ============================================================
// PRODUCTOS (catalogo global)
// ============================================================

export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  productosCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriaQuery extends PaginationQuery {
  q?: string;
  activo?: "true" | "false";
}

export interface CreateCategoriaPayload {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface UpdateCategoriaPayload {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}

/**
 * Item de `GET /productos` (ProductosService.toDto). `margin` es el margen
 * porcentual calculado en el servidor. Precios en decimales.
 *
 * El backend retorna `disponiblePos` por compatibilidad (columna física).
 * En el código de UI usar siempre `disponiblePos` — es el nombre del campo
 * en la respuesta JSON.
 */
export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: string;
  categoria: string;
  unidad: string;
  precioVenta: number;
  precioCosto: number;
  /**
   * `true` si el producto está disponible para la venta.
   * El backend lo expone como `disponiblePos` por compatibilidad.
   */
  disponiblePos: boolean;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  /** Margen % = round((precioVenta-precioCosto)/precioVenta*100), 0 si venta=0. */
  margin: number;
}

/** `GET /productos/resumen` — KPIs globales del catálogo. */
export interface ProductoResumen {
  total: number;
  activos: number;
  enPos: number;
  valorCatalogo: number;
  margenPromedio: number;
}

/** `ProductoQueryDto`. `activo` viaja como 'true' | 'false'. */
export interface ProductoQuery extends PaginationQuery {
  q?: string;
  categoriaId?: string;
  activo?: "true" | "false";
}

/** `CreateProductoDto`. `codigo` es unico e inmutable tras el alta. */
export interface CreateProductoPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoriaId: string;
  unidad?: string;
  precioVenta: number;
  precioCosto: number;
  disponiblePos?: boolean;
  activo?: boolean;
}

/** `UpdateProductoDto` — todos opcionales; `codigo` no se edita. */
export interface UpdateProductoPayload {
  nombre?: string;
  descripcion?: string;
  categoriaId?: string;
  unidad?: string;
  precioVenta?: number;
  precioCosto?: number;
  disponiblePos?: boolean;
  activo?: boolean;
}

// ============================================================
// INVENTARIO (stock por sede)
// ============================================================

/** Estado calculado del stock frente al minimo. */
export type InventarioEstado = "OK" | "ALERTA" | "CRITICO";

/** Tipos de movimiento de stock (kardex). */
export type MovimientoTipo =
  | "ENTRADA"
  | "SALIDA"
  | "AJUSTE"
  | "TRASLADO"
  | "SALIDA_VENTA"
  | "ENTRADA_ANULACION";

/** Fila de `GET /inventario` (InventarioService.toDto). */
export interface InventarioItem {
  id: string;
  productoId: string;
  sedeId: string;
  codigo: string;
  producto: string;
  categoria: string;
  unidad: string;
  stock: number;
  min: number;
  max: number;
  costo: number;
  ubicacion: string;
  estado: InventarioEstado;
  updatedAt: string;
}

/** `InventarioQueryDto`. `estado` se filtra en memoria sobre la pagina. */
export interface InventarioQuery extends PaginationQuery {
  q?: string;
  categoriaId?: string;
  estado?: InventarioEstado;
  sedeId?: string;
}

/** `GET /inventario/resumen` — KPIs de la sede. */
export interface InventarioResumen {
  totalItems: number;
  ok: number;
  alerta: number;
  critico: number;
  valorTotal: number;
}

/** `UpsertInventarioDto` — configura parametros de stock (min/max/ubicacion). */
export interface UpsertInventarioPayload {
  productoId: string;
  sedeId?: string;
  stockMin?: number;
  stockMax?: number;
  ubicacion?: string;
}

/** `AjusteStockDto`. AJUSTE fija el stock al valor de conteo fisico. */
export interface AjusteStockPayload {
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
  referencia?: string;
}

// ============================================================
// KARDEX (historico de movimientos, solo lectura)
// ============================================================

/** Fila de `GET /kardex` (KardexService.toDto). Solo lectura. */
export interface KardexMovimiento {
  id: string;
  fecha: string;
  hora: string;
  producto: string;
  codigo: string;
  tipo: MovimientoTipo;
  cantidad: number;
  unidad: string;
  stockAnterior: number;
  stockNuevo: number;
  valor: number;
  referencia: string;
  usuario: string;
}

/** `KardexQueryDto`. `desde`/`hasta` en YYYY-MM-DD (rango inclusivo). */
export interface KardexQuery extends PaginationQuery {
  q?: string;
  tipo?: MovimientoTipo;
  productoId?: string;
  desde?: string;
  hasta?: string;
  sedeId?: string;
}

/** `GET /kardex/resumen` — KPIs de los movimientos filtrados. */
export interface KardexResumen {
  totalMovimientos: number;
  entradas: number;
  salidas: number;
  valorTotal: number;
}

// ============================================================
// COMPRAS (ordenes de compra + proveedores)
// ============================================================

/** Estados de una orden de compra (RECIBIDA y CANCELADA son terminales). */
export type CompraEstado = "PENDIENTE" | "ENVIADA" | "RECIBIDA" | "CANCELADA";

/** Linea de una orden de compra (solo en el detalle). */
export interface CompraItem {
  id: string;
  productoId: string;
  codigo: string;
  producto: string;
  cantidad: number;
  costoUnit: number;
  subtotal: number;
}

/**
 * Orden de compra de `GET /compras` (ComprasService.toDto). `items` solo
 * viene en el detalle (`GET /compras/:id`) y en las mutaciones.
 */
export interface Compra {
  id: string;
  orden: string;
  fecha: string;
  proveedor: string;
  proveedorId: string;
  articulos: number;
  total: number;
  estado: CompraEstado;
  eta?: string;
  solicitadoPor: string;
  notas: string;
  recibidaAt: string | null;
  items?: CompraItem[];
}

/** `CompraQueryDto`. */
export interface CompraQuery extends PaginationQuery {
  q?: string;
  estado?: CompraEstado;
  proveedorId?: string;
  sedeId?: string;
}

/** `GET /compras/resumen` — KPIs de órdenes de la sede. */
export interface ComprasResumen {
  totalOrdenes: number;
  pendientes: number;
  recibidas: number;
  montoPendiente: number;
}

/** Linea al crear una orden (`CompraItemDto`). */
export interface CreateCompraItem {
  productoId: string;
  cantidad: number;
  costoUnit: number;
}

/** `CreateCompraDto` — al menos un item; el total lo calcula el servidor. */
export interface CreateCompraPayload {
  proveedorId: string;
  sedeId?: string;
  eta?: string;
  notas?: string;
  items: CreateCompraItem[];
}

/** `CambiarEstadoCompraDto`. */
export interface CambiarEstadoCompraPayload {
  estado: CompraEstado;
}

/** Proveedor de `GET /compras/proveedores` (ProveedoresService). */
export interface Proveedor {
  id: string;
  nombre: string;
  categoria: string;
  contacto: string;
  telefono: string;
  email: string;
  activo: boolean;
  /** Numero de ordenes asociadas. */
  ordenes: number;
  /** Total comprado (ordenes no canceladas). */
  total: number;
}

/** Campos crudos que devuelven `POST`/`PATCH /compras/proveedores`. */
export interface ProveedorBase {
  id: string;
  nombre: string;
  categoria: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  createdAt: string;
}

/** `ProveedorQueryDto`. `activo` viaja como 'true' | 'false'. */
export interface ProveedorQuery extends PaginationQuery {
  q?: string;
  categoria?: string;
  activo?: "true" | "false";
}

/** `CreateProveedorDto` — nombre minimo 2 chars. */
export interface CreateProveedorPayload {
  nombre: string;
  categoria?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

/** `UpdateProveedorDto` — todos opcionales. */
export interface UpdateProveedorPayload {
  nombre?: string;
  categoria?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
}
