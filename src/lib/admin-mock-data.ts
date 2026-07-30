import type { ActiveSession, AdminPermission, AdminRole, AuditEvent } from '@/types';

export const mockPermissions: AdminPermission[] = [
  { id: 'p1', nombre: 'usuarios:leer', modulo: 'usuarios', descripcion: 'Ver lista y detalle de usuarios' },
  { id: 'p2', nombre: 'usuarios:crear', modulo: 'usuarios', descripcion: 'Crear nuevos usuarios' },
  { id: 'p3', nombre: 'usuarios:editar', modulo: 'usuarios', descripcion: 'Editar y reactivar usuarios' },
  { id: 'p4', nombre: 'usuarios:eliminar', modulo: 'usuarios', descripcion: 'Desactivar usuarios' },
  { id: 'p5', nombre: 'usuarios:resetear-password', modulo: 'usuarios', descripcion: 'Generar contraseñas temporales' },
  { id: 'p6', nombre: 'roles:leer', modulo: 'roles', descripcion: 'Ver roles y sus permisos' },
  { id: 'p7', nombre: 'permisos:leer', modulo: 'permisos', descripcion: 'Consultar el catálogo de permisos' },
  { id: 'p8', nombre: 'audit:leer', modulo: 'audit', descripcion: 'Consultar registros de auditoría' },
  { id: 'p9', nombre: 'establecimientos:leer', modulo: 'establecimientos', descripcion: 'Ver sedes disponibles' },
  { id: 'p10', nombre: 'establecimientos:crear', modulo: 'establecimientos', descripcion: 'Crear nuevas sedes' },
  { id: 'p11', nombre: 'establecimientos:editar', modulo: 'establecimientos', descripcion: 'Editar, activar y eliminar sedes' },
];

const allPermissions = mockPermissions.map((permission) => permission.nombre);

export const mockAdminRoles: AdminRole[] = [
  { id: 'r1', nombre: 'SUPERADMIN', descripcion: 'Control total del sistema y configuración global.', nivel: 100, activo: true, usuarios: 1, permisos: allPermissions, base: true },
  { id: 'r2', nombre: 'ADMIN', descripcion: 'Administración de usuarios y operación de una sede.', nivel: 50, activo: true, usuarios: 3, permisos: allPermissions.filter((permission) => !['establecimientos:crear', 'establecimientos:editar'].includes(permission)), base: true },
  { id: 'r3', nombre: 'CAJERO', descripcion: 'Operación de caja y cobros.', nivel: 10, activo: true, usuarios: 4, permisos: [], base: true },
  { id: 'r4', nombre: 'MOZO', descripcion: 'Atención de mesas y registro de pedidos.', nivel: 10, activo: true, usuarios: 7, permisos: [], base: true },
  { id: 'r5', nombre: 'COCINA', descripcion: 'Preparación y seguimiento de comandas.', nivel: 10, activo: true, usuarios: 5, permisos: [], base: true },
  { id: 'r6', nombre: 'BARTENDER', descripcion: 'Preparación y despacho de bebidas.', nivel: 10, activo: false, usuarios: 2, permisos: [], base: true },
];

export const mockAuditEvents: AuditEvent[] = [
  { id: 'a1', accion: 'LOGIN_EXITOSO', entidad: 'Sesion', usuario: 'keyli', sede: 'Zona Rosa', ip: '192.168.1.24', userAgent: 'Chrome 126 / Windows', createdAt: '30 Jul 2026, 09:42', detalle: { dispositivo: 'PC administración' } },
  { id: 'a2', accion: 'CREAR_ESTABLECIMIENTO', entidad: 'Establecimiento', entidadId: 's4', usuario: 'keyli', sede: 'Todas', ip: '192.168.1.24', userAgent: 'Chrome 126 / Windows', createdAt: '30 Jul 2026, 09:31', detalle: { nombre: 'Laureles' } },
  { id: 'a3', accion: 'EDITAR_USUARIO', entidad: 'Usuario', entidadId: 'u8', usuario: 'charly', sede: 'Zona Rosa', ip: '10.0.0.18', userAgent: 'Safari / macOS', createdAt: '30 Jul 2026, 09:05', detalle: { cambios: 'rolId, sedeId' } },
  { id: 'a4', accion: 'RESETEAR_PASSWORD', entidad: 'Usuario', entidadId: 'u6', usuario: 'charly', sede: 'Zona Rosa', ip: '10.0.0.18', userAgent: 'Safari / macOS', createdAt: '30 Jul 2026, 08:54', detalle: { sesionesRevocadas: true } },
  { id: 'a5', accion: 'ASIGNAR_PERMISOS_ROL', entidad: 'Rol', entidadId: 'r2', usuario: 'keyli', sede: 'Todas', ip: '192.168.1.24', userAgent: 'Chrome 126 / Windows', createdAt: '29 Jul 2026, 18:22', detalle: { permisos: 9 } },
  { id: 'a6', accion: 'DESACTIVAR_USUARIO', entidad: 'Usuario', entidadId: 'u11', usuario: 'charly', sede: 'El Poblado', ip: '172.16.0.31', userAgent: 'Firefox / Linux', createdAt: '29 Jul 2026, 17:41', detalle: { username: 'pmartinez', sesionesRevocadas: true } },
  { id: 'a7', accion: 'EDITAR_ESTABLECIMIENTO', entidad: 'Establecimiento', entidadId: 's2', usuario: 'keyli', sede: 'Todas', ip: '192.168.1.24', userAgent: 'Chrome 126 / Windows', createdAt: '29 Jul 2026, 16:18', detalle: { cambios: 'telefono, ruc' } },
  { id: 'a8', accion: 'CAMBIAR_PASSWORD', entidad: 'Usuario', entidadId: 'u3', usuario: 'rsalinas', sede: 'Chapinero', ip: '10.20.1.7', userAgent: 'Chrome / Android', createdAt: '29 Jul 2026, 14:03', detalle: { sesionesRevocadas: true } },
  { id: 'a9', accion: 'CREAR_USUARIO', entidad: 'Usuario', entidadId: 'u12', usuario: 'keyli', sede: 'Todas', ip: '192.168.1.24', userAgent: 'Chrome 126 / Windows', createdAt: '29 Jul 2026, 11:37', detalle: { username: 'bartender02', rol: 'BARTENDER' } },
  { id: 'a10', accion: 'EDITAR_ROL', entidad: 'Rol', entidadId: 'r6', usuario: 'keyli', sede: 'Todas', ip: '192.168.1.24', userAgent: 'Chrome 126 / Windows', createdAt: '28 Jul 2026, 19:12', detalle: { activo: false } },
  { id: 'a11', accion: 'CUENTA_BLOQUEADA', entidad: 'Usuario', entidadId: 'u9', usuario: 'sistema', sede: 'Chapinero', ip: '10.20.1.14', userAgent: 'Chrome / Android', createdAt: '28 Jul 2026, 18:49', detalle: { intentos: 5, minutos: 15 } },
  { id: 'a12', accion: 'ELIMINAR_ESTABLECIMIENTO', entidad: 'Establecimiento', entidadId: 's5', usuario: 'keyli', sede: 'Todas', ip: '192.168.1.24', userAgent: 'Chrome 126 / Windows', createdAt: '28 Jul 2026, 15:26', detalle: { nombre: 'Sede temporal' } },
];

export const mockSessions: ActiveSession[] = [
  { id: 'se1', deviceName: 'PC Administración', deviceType: 'web', browser: 'Chrome 126 / Windows 11', location: 'Bogotá, Colombia', ip: '192.168.1.24', lastUsedAt: 'Activa ahora', createdAt: '30 Jul 2026, 08:12', actual: true },
  { id: 'se2', deviceName: 'MacBook personal', deviceType: 'web', browser: 'Safari 18 / macOS', location: 'Bogotá, Colombia', ip: '181.52.18.41', lastUsedAt: 'Hace 2 horas', createdAt: '28 Jul 2026, 16:45', actual: false },
  { id: 'se3', deviceName: 'Teléfono Android', deviceType: 'android', browser: 'Chrome Mobile / Android 15', location: 'Medellín, Colombia', ip: '190.85.42.11', lastUsedAt: 'Ayer, 22:14', createdAt: '25 Jul 2026, 19:20', actual: false },
  { id: 'se4', deviceName: 'iPad caja', deviceType: 'ios', browser: 'Safari / iPadOS', location: 'Bogotá, Colombia', ip: '10.0.0.29', lastUsedAt: 'Hace 3 días', createdAt: '21 Jul 2026, 10:08', actual: false },
];
