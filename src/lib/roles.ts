export type UserRole = 'superadmin' | 'administrador' | 'empleado';

/** Rutas visibles por rol. '*' = todas */
export const roleNavAccess: Record<UserRole, string[] | '*'> = {
  superadmin: '*',
  administrador: [
    '/dashboard', '/ventas', '/caja', '/inventario', '/kardex',
    '/compras', '/asistencia', '/productos', '/sucursales',
  ],
  empleado: [
    '/dashboard', '/ventas', '/caja', '/inventario', '/kardex',
    '/asistencia', '/productos',
  ],
};

export const canAccess = (role: UserRole, href: string): boolean => {
  const access = roleNavAccess[role];
  if (access === '*') return true;
  return access.includes(href);
};

/** Permisos CRUD por módulo */
type Module = 'productos' | 'inventario' | 'usuarios' | 'sucursales' |
              'compras' | 'caja' | 'asistencia' | 'kardex';

export const permisos: Record<UserRole, Record<Module, { create: boolean; edit: boolean; delete: boolean }>> = {
  superadmin: {
    productos:   { create: true,  edit: true,  delete: true  },
    inventario:  { create: true,  edit: true,  delete: true  },
    usuarios:    { create: true,  edit: true,  delete: true  },
    sucursales:  { create: true,  edit: true,  delete: true  },
    compras:     { create: true,  edit: true,  delete: true  },
    caja:        { create: true,  edit: true,  delete: true  },
    asistencia:  { create: true,  edit: true,  delete: true  },
    kardex:      { create: true,  edit: true,  delete: true  },
  },
  administrador: {
    productos:   { create: true,  edit: true,  delete: true  },
    inventario:  { create: true,  edit: true,  delete: false },
    usuarios:    { create: false, edit: false, delete: false },
    sucursales:  { create: false, edit: false, delete: false },
    compras:     { create: true,  edit: true,  delete: false },
    caja:        { create: true,  edit: true,  delete: false },
    asistencia:  { create: true,  edit: true,  delete: false },
    kardex:      { create: false, edit: false, delete: false },
  },
  empleado: {
    productos:   { create: false, edit: false, delete: false },
    inventario:  { create: false, edit: true,  delete: false }, // puede ajustar stock
    usuarios:    { create: false, edit: false, delete: false },
    sucursales:  { create: false, edit: false, delete: false },
    compras:     { create: false, edit: false, delete: false },
    caja:        { create: true,  edit: false, delete: false }, // puede registrar ventas
    asistencia:  { create: false, edit: false, delete: false },
    kardex:      { create: false, edit: false, delete: false },
  },
};

export const can = (role: UserRole, module: Module, action: 'create' | 'edit' | 'delete'): boolean =>
  permisos[role]?.[module]?.[action] ?? false;

export const roleLabel: Record<UserRole, string> = {
  superadmin:    'Super Admin',
  administrador: 'Administrador',
  empleado:      'Empleado',
};

export const roleBadgeClass: Record<UserRole, string> = {
  superadmin:    'bg-purple-500/10 border-purple-500/25 text-purple-500',
  administrador: 'bg-amber-500/10  border-amber-500/25  text-amber-500',
  empleado:      'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
};
