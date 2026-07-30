// ============ Auth Types ============
export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: 'superadmin' | 'administrador' | 'empleado';
  sede: string;
  avatar?: string;
  initials: string;
  estado: 'activo' | 'inactivo';
  ultimoAcceso: string;
  mustChangePassword?: boolean;
  passwordChangedAt?: string;
}

export interface AdminRole {
  id: string;
  nombre: string;
  descripcion: string;
  nivel: number;
  activo: boolean;
  usuarios: number;
  permisos: string[];
  base: boolean;
}

export interface AdminPermission {
  id: string;
  nombre: string;
  modulo: 'usuarios' | 'roles' | 'permisos' | 'audit' | 'establecimientos';
  descripcion: string;
}

export interface AuditEvent {
  id: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  usuario: string;
  sede: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  detalle: Record<string, string | number | boolean>;
}

export interface ActiveSession {
  id: string;
  deviceName: string;
  deviceType: 'web' | 'android' | 'ios';
  browser: string;
  location: string;
  ip: string;
  lastUsedAt: string;
  createdAt: string;
  actual: boolean;
}

// ============ Dashboard Types ============
export interface DashboardKPI {
  label: string;
  value: string;
  subtitle?: string;
  badge?: { text: string; type: 'success' | 'warning' | 'danger' };
  icon: string;
}

export interface SaleRecord {
  ticket: string;
  hora: string;
  articulos: number;
  total: number;
  metodo: 'Efectivo' | 'Tarjeta' | 'Transferencia';
  cajero: string;
}

export interface TopProduct {
  rank: number;
  name: string;
  units: number;
  percentage: number;
}

export interface InventoryAlert {
  name: string;
  stock: number;
  min: number;
  critical: boolean;
}

// ============ POS Types ============
/** Producto completo del catálogo — también usado por el POS */
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;          // ruta en /assets/
  emoji: string;
  salePrice: number;      // precio de venta
  costPrice: number;      // precio de costo
  margin: number;         // % margen calculado
  availableInPOS: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  // alias POS (salePrice)
  price: number;
}

export interface OrderItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Mixto';

// ============ Caja Types ============
export interface CashMovement {
  id: string;
  hora: string;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  metodo: string;
  monto: number;
}

// ============ Inventario Types ============
export interface InventoryItem {
  codigo: string;
  producto: string;
  categoria: string;
  stock: number;
  min: number;
  max: number;
  estado: 'OK' | 'ALERTA' | 'CRITICO';
  costo: number;
  ubicacion: string;
}

// ============ Kardex Types ============
export interface KardexEntry {
  id: string;
  fecha: string;
  hora: string;
  producto: string;
  codigo: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRASLADO';
  cantidad: number;
  unidad: string;
  stockAnterior: number;
  stockNuevo: number;
  valor: number;
  referencia: string;
  usuario: string;
}

// ============ Compras Types ============
export interface PurchaseOrder {
  orden: string;
  fecha: string;
  proveedor: string;
  articulos: number;
  total: number;
  estado: 'PENDIENTE' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA';
  eta?: string;
  solicitadoPor: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  categoria: string;
  contacto: string;
  telefono: string;
  ordenes: number;
  total: string;
}

// ============ Asistencia Types ============
export interface Employee {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: 'PRESENTE' | 'TARDANZA' | 'AUSENTE' | 'DIA LIBRE';
  turno: string;
  entrada?: string;
  horas: string;
  color: string;
}

export interface AttendanceRecord {
  hora: string;
  empleado: string;
  accion: string;
  tipo: 'ENTRADA' | 'TARDANZA' | 'SALIDA';
}

// ============ Sucursales Types ============
export interface Sucursal {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  estado: 'ACTIVA' | 'EN CONSTRUCCION';
  ventasHoy?: string;
  empleados?: number;
  ticketProm?: string;
  participacion?: number;
  administrador: string;
  desde: string;
  color: string;
  telefono?: string;
  ruc?: string;
  updatedAt?: string;
}
