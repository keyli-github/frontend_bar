/**
 * Navegacion — fuente unica de verdad.
 *
 * Se declara aqui una vez y lo consumen el sidebar, el header y el bottom-nav
 * movil. Anadir una ruta en un solo sitio evita que los tres se desincronicen.
 *
 * Las rutas operativas consumen modulos reales del backend. Ventas se mantiene
 * como excepcion informativa y no ejecuta acciones hasta que exista su API.
 */
import {
  LayoutDashboard,
  Home,
  Users,
  Shield,
  KeySquare,
  ScrollText,
  Settings,
  User,
  Tags,
  BarChart3,
  ClipboardList,
  FileText,
  Landmark,
  Package,
  ShieldCheck,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  /** Titulo mostrado en el header. Por defecto, `name`. */
  title?: string;
}

export interface NavModule {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

/** Enlace fuera de modulos, siempre en la parte superior del sidebar. */
export const NAV_ROOT: NavItem = {
  name: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard,
};

export const NAV_MODULES: NavModule[] = [
  {
    id: 'operaciones',
    label: 'Caja',
    icon: BarChart3,
    items: [
      { name: 'Caja', href: '/caja', icon: Landmark },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Package,
    items: [
      { name: 'Productos', href: '/productos', icon: UtensilsCrossed },
      { name: 'Categorías', href: '/categorias', icon: Tags },
      { name: 'Inventario', href: '/inventario', icon: Package },
      { name: 'Kardex', href: '/kardex', icon: FileText },
      { name: 'Compras', href: '/compras', icon: Truck },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: ClipboardList,
    items: [{ name: 'Asistencia', href: '/asistencia', icon: ClipboardList }],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: Settings,
    items: [
      { name: 'Usuarios', href: '/usuarios', icon: Users },
      { name: 'Sucursales', href: '/sucursales', icon: Home },
      { name: 'Roles', href: '/roles', icon: Shield },
      { name: 'Permisos', href: '/permisos', icon: KeySquare },
      { name: 'Auditoría', href: '/auditoria', icon: ScrollText },
      { name: 'Seguridad', href: '/seguridad', icon: ShieldCheck },
    ],
  },
];

/** Rutas accesibles que no aparecen en el sidebar. */
const NAV_HIDDEN: NavItem[] = [
  { name: 'Perfil', href: '/perfil', icon: User },
];

/** Indice plano href → NavItem. Se construye una sola vez al importar. */
const ROUTE_INDEX = new Map<string, NavItem>(
  [NAV_ROOT, ...NAV_MODULES.flatMap((m) => m.items), ...NAV_HIDDEN].map((item) => [
    item.href,
    item,
  ]),
);

/** Titulo de la ruta para el header. */
export function getRouteTitle(pathname: string): string {
  const item = ROUTE_INDEX.get(pathname);
  if (item) return item.title ?? item.name;

  // Rutas anidadas: /usuarios/123 hereda el titulo de /usuarios
  for (const [href, nav] of ROUTE_INDEX) {
    if (pathname.startsWith(`${href}/`)) return nav.title ?? nav.name;
  }
  return 'Bar beer';
}

/** Id del modulo que contiene la ruta, o '' si no pertenece a ninguno. */
export function getActiveModuleId(pathname: string): string {
  return (
    NAV_MODULES.find((m) => m.items.some((i) => pathname.startsWith(i.href)))?.id ?? ''
  );
}

/** Accesos rapidos del bottom-nav movil, en orden de uso previsto. */
export const MOBILE_NAV: NavItem[] = [
  NAV_ROOT,
  { name: 'Usuarios', href: '/usuarios', icon: Users },
  { name: 'Sedes', href: '/sucursales', icon: Home },
  { name: 'Auditoría', href: '/auditoria', icon: ScrollText },
];
