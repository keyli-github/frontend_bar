'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { canAccess } from '@/lib/roles';
import type { UserRole } from '@/lib/roles';
import {
  LayoutDashboard, ShoppingCart, Landmark,
  Package, FileText, Truck, ClipboardList,
  Home, Users, ChevronDown,
  PanelLeftClose, PanelLeftOpen, X,
  UtensilsCrossed, BarChart3, Settings,
} from 'lucide-react';

/* ─── Estructura de módulos y submódulos ─── */
interface NavItem { name: string; href: string; icon: React.ElementType }
interface NavModule {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const NAV_MODULES: NavModule[] = [
  {
    id: 'ventas',
    label: 'Ventas & Caja',
    icon: BarChart3,
    items: [
      { name: 'Ventas / POS', href: '/ventas',  icon: ShoppingCart },
      { name: 'Caja',         href: '/caja',    icon: Landmark },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Package,
    items: [
      { name: 'Productos',  href: '/productos',  icon: UtensilsCrossed },
      { name: 'Inventario', href: '/inventario', icon: Package },
      { name: 'Kardex',     href: '/kardex',     icon: FileText },
      { name: 'Compras',    href: '/compras',    icon: Truck },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: ClipboardList,
    items: [
      { name: 'Asistencia', href: '/asistencia', icon: ClipboardList },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: Settings,
    items: [
      { name: 'Sucursales', href: '/sucursales', icon: Home },
      { name: 'Usuarios',   href: '/usuarios',   icon: Users },
    ],
  },
];

/* ─── Animación de acordeón con CSS ─── */
function AccordionContent({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{ maxHeight: open ? '400px' : '0px', opacity: open ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

/* ─── Componente principal ─── */
export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleCollapsed } = useUIStore();
  const { user } = useAuthStore();
  const role     = (user?.role ?? 'empleado') as UserRole;

  // Detectar qué módulo contiene la ruta activa
  const activeModule = NAV_MODULES.find((m) =>
    m.items.some((i) => i.href === pathname)
  )?.id ?? '';

  // Estado de acordeones (abierto por defecto el módulo activo)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV_MODULES.forEach((m) => { init[m.id] = m.id === activeModule; });
    return init;
  });

  // Cuando la ruta cambia, asegurar que el módulo activo esté abierto
  useEffect(() => {
    const mod = NAV_MODULES.find((m) => m.items.some((i) => i.href === pathname))?.id;
    if (mod) setExpanded((p) => ({ ...p, [mod]: true }));
  }, [pathname]);

  const toggle = (id: string) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const collapsed = sidebarCollapsed;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          style={{ backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col transition-all duration-300 ease-in-out',
          'bg-sidebar border-r border-sidebar-border',
          'lg:static lg:z-auto lg:translate-x-0 lg:rounded-r-2xl',
          sidebarOpen ? 'translate-x-0 w-[268px]' : '-translate-x-full w-[268px]',
          collapsed ? 'lg:w-[68px]' : 'lg:w-[268px]',
        )}
      >
        {/* ── LOGO + COLLAPSE ── */}
        <div className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0">
          <Image
            src="/assets/barbeer.png"
            alt="Bar beer logo"
            width={36}
            height={36}
            className="object-contain flex-shrink-0"
            priority
          />
          {!collapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="font-extrabold text-sidebar-foreground text-base leading-none truncate">
                Bar beer
              </p>
              <p className="text-[9px] text-sidebar-foreground/40 tracking-widest uppercase mt-0.5">
                ERP SYSTEM
              </p>
            </div>
          )}

          {/* Collapse desktop */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir' : 'Colapsar'}
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>

          {/* Close mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── NAVIGATION ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5">

          {/* Dashboard (siempre visible, sin módulo) */}
          {canAccess(role, '/dashboard') && (
            <Link
              href="/dashboard"
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? 'Dashboard' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 mb-2',
                collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
                pathname === '/dashboard'
                  ? 'bg-amber-500/12 text-amber-600 dark:text-amber-400'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <LayoutDashboard
                size={18}
                className={cn('flex-shrink-0', pathname === '/dashboard' && 'text-amber-500')}
              />
              {!collapsed && <span>Dashboard</span>}
            </Link>
          )}

          {/* Separator */}
          {!collapsed && (
            <div className="h-px bg-sidebar-border mx-1 mb-2" />
          )}

          {/* Módulos con acordeón */}
          {NAV_MODULES.map((mod) => {
            // Filtrar items visibles por rol
            const visibleItems = mod.items.filter((i) => canAccess(role, i.href));
            if (visibleItems.length === 0) return null;

            const isModuleActive = visibleItems.some((i) => i.href === pathname);
            const isOpen = expanded[mod.id] ?? false;

            return (
              <div key={mod.id} className="mb-0.5">
                {/* Módulo header (toggle del acordeón) */}
                {!collapsed ? (
                  <button
                    onClick={() => toggle(mod.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200',
                      isModuleActive
                        ? 'text-amber-500'
                        : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
                    )}
                  >
                    <mod.icon
                      size={14}
                      className={cn('flex-shrink-0', isModuleActive && 'text-amber-500')}
                    />
                    <span className="flex-1 text-left">{mod.label}</span>
                    <ChevronDown
                      size={13}
                      className={cn(
                        'flex-shrink-0 transition-transform duration-300',
                        isOpen ? 'rotate-180' : 'rotate-0'
                      )}
                    />
                  </button>
                ) : (
                  /* En modo colapsado: separador */
                  <div className="h-px bg-sidebar-border mx-2 my-1" />
                )}

                {/* Sub-items con animación */}
                {!collapsed ? (
                  <AccordionContent open={isOpen}>
                    <ul className="pl-2 pb-1 space-y-0.5">
                      {visibleItems.map((item, idx) => {
                        const isActive = pathname === item.href;
                        return (
                          <li
                            key={item.href}
                            style={{
                              transitionProperty: 'opacity, transform',
                              transitionDuration: '250ms',
                              transitionTimingFunction: 'ease',
                              transitionDelay: isOpen ? `${idx * 40}ms` : '0ms',
                              opacity: isOpen ? 1 : 0,
                              transform: isOpen ? 'translateX(0)' : 'translateX(-8px)',
                            }}
                          >
                            <Link
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                                isActive
                                  ? 'bg-amber-500/12 text-amber-600 dark:text-amber-400'
                                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                              )}
                            >
                              {/* Línea indicadora */}
                              <span className={cn(
                                'w-0.5 h-4 rounded-full flex-shrink-0 transition-all duration-200',
                                isActive ? 'bg-amber-500' : 'bg-sidebar-border'
                              )} />
                              <item.icon
                                size={16}
                                className={cn('flex-shrink-0', isActive && 'text-amber-500')}
                              />
                              <span>{item.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </AccordionContent>
                ) : (
                  /* Colapsado: solo iconos */
                  <ul className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            title={item.name}
                            className={cn(
                              'flex items-center justify-center py-2.5 rounded-lg transition-all duration-150',
                              isActive
                                ? 'bg-amber-500/12 text-amber-500'
                                : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                            )}
                          >
                            <item.icon size={18} className="flex-shrink-0" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── PERFIL ── */}
        <div
          onClick={() => { router.push('/perfil'); setSidebarOpen(false); }}
          className={cn(
            'flex items-center gap-3 cursor-pointer transition-colors border-t border-sidebar-border p-4 flex-shrink-0',
            'hover:bg-sidebar-accent',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? `${user?.name} — Perfil` : undefined}
        >
          <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.initials || 'CM'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {user?.name || 'Carlos Mendoza'}
              </p>
              <p className="text-xs text-amber-500 capitalize">{user?.role || 'Superadmin'}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ─── Toggle para mobile ─── */
export function SidebarToggle() {
  const { toggleSidebar } = useUIStore();
  return (
    <button
      onClick={toggleSidebar}
      className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <PanelLeftOpen size={21} />
    </button>
  );
}
