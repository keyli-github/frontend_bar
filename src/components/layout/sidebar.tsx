'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useIsDesktop } from '@/hooks/use-media-query';
import { canAccess, getRoleLabel } from '@/lib/roles';
import { NAV_MODULES as API_NAV_MODULES, NAV_ROOT } from '@/lib/navigation';
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  FileText,
  Landmark,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react';

interface SidebarNavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarNavModule {
  id: string;
  label: string;
  icon: React.ElementType;
  items: SidebarNavItem[];
}

// Incluye tambien los modulos visuales que aun no cuentan con API propia.
const NAV_MODULES: SidebarNavModule[] = [
  {
    id: 'ventas',
    label: 'Ventas & Caja',
    icon: BarChart3,
    items: [
      { name: 'Ventas / POS', href: '/ventas', icon: ShoppingCart },
      { name: 'Caja', href: '/caja', icon: Landmark },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Package,
    items: [
      { name: 'Productos', href: '/productos', icon: UtensilsCrossed },
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
  ...API_NAV_MODULES.map((module) =>
    module.id === 'admin'
      ? {
          ...module,
          items: [
            ...module.items,
            { name: 'Seguridad', href: '/seguridad', icon: ShieldCheck },
          ],
        }
      : module,
  ),
];

/** Contenedor de acordeon animado por altura, sin JS de medicion. */
function AccordionContent({
  open,
  id,
  labelledBy,
  children,
}: {
  open: boolean;
  id: string;
  labelledBy: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      hidden={!open}
      className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
      style={{ maxHeight: open ? '24rem' : '0', opacity: open ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

const itemBase =
  'flex items-center gap-2.5 rounded-lg px-3 min-h-control-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const itemActive = 'bg-primary/12 text-primary-text';
const itemIdle =
  'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground';

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleCollapsed } = useUIStore();
  const expandedOverrides = useUIStore((s) => s.expandedModules);
  const toggleModule = useUIStore((s) => s.toggleModule);
  // Permisos granulares del JWT: son la fuente de verdad para pintar el menu.
  const isDesktop = useIsDesktop();
  const permisos = useAuthStore((s) => s.permisos);
  const user = useAuthStore((s) => s.user);

  const panelRef = useRef<HTMLElement>(null);
  const activeModuleId =
    NAV_MODULES.find((module) =>
      module.items.some(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
      ),
    )?.id ?? '';

  /**
   * El modulo de la ruta actual esta abierto por defecto; el usuario puede
   * sobreescribirlo. Se deriva en render en vez de sincronizarse con un
   * `useEffect` + `setState` (que causaba renders en cascada y era el error
   * `react-hooks/set-state-in-effect` que reportaba ESLint).
   */
  const isModuleOpen = (id: string) => expandedOverrides[id] ?? id === activeModuleId;

  // Cerrar el cajon movil con Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  // Bloquear el scroll del body mientras el cajon movil este abierto
  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen]);

  const collapsed = sidebarCollapsed;
  const closeOnMobile = () => setSidebarOpen(false);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={closeOnMobile}
          aria-hidden="true"
        />
      )}

      <aside
        ref={panelRef}
        aria-label="Navegación lateral"
        /**
         * En movil el panel sigue en el DOM aunque este desplazado fuera de
         * pantalla, asi que sin `inert` el tabulador entraba en enlaces
         * invisibles. En escritorio esta siempre visible y debe ser navegable.
         *
         * Antes esta linea era `inert={!sidebarOpen ? undefined : undefined}`:
         * ambas ramas daban `undefined`, asi que no hacia absolutamente nada.
         */
        inert={!isDesktop && !sidebarOpen}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-dvh flex-col bg-sidebar border-r border-sidebar-border',
          'transition-[transform,width] duration-300 ease-in-out',
          'lg:static lg:z-auto lg:h-full lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'w-[min(17rem,85vw)]',
          collapsed ? 'lg:w-[4.25rem]' : 'lg:w-[17rem]',
        )}
      >
        {/* ── Cabecera ── */}
        <div className={cn("flex shrink-0 items-center gap-2.5 px-4 py-4", collapsed && "flex-col gap-2 px-2 py-3")}>
          <Image
            src="/assets/barbeer.webp"
            alt=""
            width={36}
            height={36}
            className="shrink-0 object-contain"
            preload
          />
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-base font-extrabold leading-none text-sidebar-foreground">
                Bar beer
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-widest text-sidebar-foreground/40">
                ERP System
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
            aria-pressed={collapsed}
            className="hidden size-7 shrink-0 place-items-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:grid"
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>

          <button
            type="button"
            onClick={closeOnMobile}
            aria-label="Cerrar navegación"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navegacion ── */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-2">
          {canAccess(permisos, NAV_ROOT.href) && (
            <Link
              href={NAV_ROOT.href}
              onClick={closeOnMobile}
              title={collapsed ? NAV_ROOT.name : undefined}
              aria-current={pathname === NAV_ROOT.href ? 'page' : undefined}
              className={cn(
                itemBase,
                'mb-2',
                collapsed && 'justify-center px-0',
                pathname === NAV_ROOT.href ? itemActive : itemIdle,
              )}
            >
              <NAV_ROOT.icon size={18} className="shrink-0" aria-hidden="true" />
              {!collapsed && <span>{NAV_ROOT.name}</span>}
            </Link>
          )}

          {!collapsed && <div className="mx-1 mb-2 h-px bg-sidebar-border" />}

          {NAV_MODULES.map((mod) => {
            const visibleItems = mod.items.filter((i) => canAccess(permisos, i.href));
            if (visibleItems.length === 0) return null;

            const isActive = visibleItems.some(
              (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
            );
            const isOpen = isModuleOpen(mod.id);
            const panelId = `nav-panel-${mod.id}`;
            const buttonId = `nav-trigger-${mod.id}`;

            if (collapsed) {
              return (
                <div key={mod.id} className="mb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      toggleCollapsed();
                      toggleModule(mod.id, true);
                    }}
                    title={mod.label}
                    aria-label={mod.label}
                    className={cn(
                      itemBase,
                      'w-full justify-center px-0',
                      isActive ? itemActive : itemIdle,
                    )}
                  >
                    <mod.icon size={18} className="shrink-0" aria-hidden="true" />
                  </button>
                </div>
              );
            }

            return (
              <div key={mod.id} className="mb-0.5">
                <button
                  type="button"
                  id={buttonId}
                  onClick={() => toggleModule(mod.id, !isOpen)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 min-h-control text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'text-primary-text'
                      : 'text-sidebar-foreground/45 hover:text-sidebar-foreground/75',
                  )}
                >
                  <mod.icon size={14} className="shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left">{mod.label}</span>
                  <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={cn('shrink-0 transition-transform duration-300', isOpen && 'rotate-180')}
                  />
                </button>

                <AccordionContent open={isOpen} id={panelId} labelledBy={buttonId}>
                  <ul className="space-y-0.5 pb-1 pl-2">
                    {visibleItems.map((item) => {
                      const active =
                        pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={closeOnMobile}
                            aria-current={active ? 'page' : undefined}
                            className={cn(itemBase, active ? itemActive : itemIdle)}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'h-4 w-0.5 shrink-0 rounded-full transition-colors',
                                active ? 'bg-primary' : 'bg-sidebar-border',
                              )}
                            />
                            <item.icon size={16} className="shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </div>
            );
          })}
        </nav>

        {/* ── Perfil ── */}
        <Link
          href="/perfil"
          onClick={closeOnMobile}
          title={collapsed ? `${user?.username ?? 'Perfil'} — Perfil` : undefined}
          aria-current={pathname === '/perfil' ? 'page' : undefined}
          className={cn(
            'flex shrink-0 items-center gap-3 border-t border-sidebar-border p-4 transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsed && 'justify-center px-2',
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user?.initials ?? '··'}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                {user?.username ?? 'Usuario'}
              </span>
              <span className="block text-xs text-primary-text">
                {user ? getRoleLabel(user.rol) : '—'}
              </span>
            </span>
          )}
        </Link>
      </aside>
    </>
  );
}

/** Boton hamburguesa del header — solo visible en <lg. */
export function SidebarToggle() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Abrir navegación"
      aria-expanded={sidebarOpen}
      className="grid size-control shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
    >
      <PanelLeftOpen size={20} />
    </button>
  );
}
