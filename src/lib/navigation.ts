/**
 * Navegacion — fuente unica de verdad.
 *
 * Se declara aqui una vez y lo consumen el sidebar, el header y el bottom-nav
 * movil. Anadir una ruta en un solo sitio evita que los tres se desincronicen.
 *
 * REGLA: aqui solo entran rutas que tengan un modulo real en el backend
 * NestJS. Las pantallas de demo sin API detras se eliminaron del proyecto;
 * si vuelve a hacer falta alguna, primero se construye su controller.
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
    id: 'admin',
    label: 'Administración',
    icon: Settings,
    items: [
      { name: 'Usuarios', href: '/usuarios', icon: Users },
      { name: 'Sucursales', href: '/sucursales', icon: Home },
      { name: 'Roles', href: '/roles', icon: Shield },
      { name: 'Permisos', href: '/permisos', icon: KeySquare },
      { name: 'Auditoría', href: '/auditoria', icon: ScrollText },
    ],
  },
];

/** Rutas accesibles que no aparecen en el sidebar. */
const NAV_HIDDEN: NavItem[] = [
  { name: 'Perfil', href: '/perfil', icon: User },
  { name: 'Categorías', href: '/categorias', icon: Tags },
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
